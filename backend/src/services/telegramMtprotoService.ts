import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import mongoose from 'mongoose';
import dynamicDb, { centralModels } from '../config/db';
import telegramService from './telegramService';

// Standard Telegram API credentials (can be overridden via environment or tenant settings)
// Reference public registered app credentials for Telegram Desktop/Web
const DEFAULT_API_ID = Number(process.env.TELEGRAM_API_ID || '2040');
const DEFAULT_API_HASH = process.env.TELEGRAM_API_HASH || 'b18441a1ff607e10a989891a5462e627';

interface PendingAuth {
  client: TelegramClient;
  phoneCodeHash: string;
  phoneNumber: string;
  apiId: number;
  apiHash: string;
  createdAt: number;
}

export interface TelegramAdminDialog {
  chatId: string;
  name: string;
  type: 'supergroup' | 'channel' | 'group';
  username?: string | null;
  memberCount?: number | null;
  isCreator: boolean;
  isAdmin: boolean;
  inviteLink?: string | null;
}

export class TelegramMtprotoService {
  private static instance: TelegramMtprotoService;
  private pendingAuthMap = new Map<string, PendingAuth>(); // Key: normalized phoneNumber

  public static getInstance(): TelegramMtprotoService {
    if (!TelegramMtprotoService.instance) {
      TelegramMtprotoService.instance = new TelegramMtprotoService();
    }
    return TelegramMtprotoService.instance;
  }

  /**
   * Helper to normalize phone number to E.164 format (+919876543210)
   */
  public normalizePhoneNumber(phone: string): string {
    let clean = phone.replace(/[^\d+]/g, '').trim();
    if (!clean.startsWith('+')) {
      // If 10 digits Indian number, add +91
      if (clean.length === 10) {
        clean = `+91${clean}`;
      } else {
        clean = `+${clean}`;
      }
    }
    return clean;
  }

  /**
   * Resolve API credentials for tenant
   */
  public async getApiCredentials(tenantId?: string): Promise<{ apiId: number; apiHash: string }> {
    let apiId = DEFAULT_API_ID;
    let apiHash = DEFAULT_API_HASH;

    if (tenantId) {
      try {
        let tenant: any = null;
        if (dynamicDb?.Tenant) {
          tenant = await dynamicDb.Tenant.findById(tenantId).lean();
          if (!tenant) {
            tenant = await dynamicDb.Tenant.findOne({ $or: [{ id: tenantId }, { tenantId: tenantId }] }).lean();
          }
        }
        if (!tenant && centralModels?.Tenant) {
          tenant = await centralModels.Tenant.findById(tenantId).lean();
        }

        if (tenant?.telegramApiId) apiId = Number(tenant.telegramApiId);
        if (tenant?.telegramApiHash) apiHash = String(tenant.telegramApiHash).trim();
      } catch (err: any) {
        console.warn('[TelegramMtprotoService] Error reading custom tenant api credentials:', err.message);
      }
    }

    return { apiId, apiHash };
  }

  /**
   * STEP 1: Send Telegram Login OTP code to Admin Phone Number
   */
  public async sendPhoneCode(
    phoneNumberRaw: string,
    tenantId?: string
  ): Promise<{ success: boolean; phoneCodeHash?: string; phoneNumber?: string; error?: string }> {
    const phoneNumber = this.normalizePhoneNumber(phoneNumberRaw);

    try {
      const { apiId, apiHash } = await this.getApiCredentials(tenantId);

      // Clean up previous pending auth if any
      const existing = this.pendingAuthMap.get(phoneNumber);
      if (existing) {
        try {
          await existing.client.disconnect();
        } catch {}
        this.pendingAuthMap.delete(phoneNumber);
      }

      const stringSession = new StringSession('');
      const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
        useWSS: false,
        deviceModel: 'RA SEBI Compliance Portal',
        appVersion: '1.0.0',
        systemVersion: 'Web'
      });

      await client.connect();

      const sendResult = await client.sendCode(
        {
          apiId,
          apiHash
        },
        phoneNumber
      );

      const phoneCodeHash = sendResult.phoneCodeHash;

      // Store in pending map with 10-minute expiry
      this.pendingAuthMap.set(phoneNumber, {
        client,
        phoneCodeHash,
        phoneNumber,
        apiId,
        apiHash,
        createdAt: Date.now()
      });

      // Set timeout cleanup
      setTimeout(() => {
        const item = this.pendingAuthMap.get(phoneNumber);
        if (item && Date.now() - item.createdAt > 600000) {
          try {
            item.client.disconnect();
          } catch {}
          this.pendingAuthMap.delete(phoneNumber);
        }
      }, 600000);

      return {
        success: true,
        phoneCodeHash,
        phoneNumber
      };
    } catch (err: any) {
      console.error('[TelegramMtprotoService] sendPhoneCode error:', err);
      const errMsg = err?.errorMessage || err?.message || 'Failed to send Telegram OTP';
      return { success: false, error: errMsg };
    }
  }

  /**
   * STEP 2: Verify Telegram OTP & 2FA Password, Save Session & Sync Groups
   */
  public async verifyPhoneCode(options: {
    phoneNumberRaw: string;
    phoneCode: string;
    phoneCodeHash: string;
    password?: string;
    tenantId?: string;
    userId?: string;
  }): Promise<{
    success: boolean;
    user?: any;
    sessionString?: string;
    syncedGroupsCount?: number;
    error?: string;
  }> {
    const phoneNumber = this.normalizePhoneNumber(options.phoneNumberRaw);
    const { phoneCode, phoneCodeHash, password, tenantId, userId } = options;

    let pending = this.pendingAuthMap.get(phoneNumber);
    let client: TelegramClient;
    let apiId = DEFAULT_API_ID;
    let apiHash = DEFAULT_API_HASH;

    try {
      if (pending) {
        client = pending.client;
        apiId = pending.apiId;
        apiHash = pending.apiHash;
      } else {
        const creds = await this.getApiCredentials(tenantId);
        apiId = creds.apiId;
        apiHash = creds.apiHash;
        client = new TelegramClient(new StringSession(''), apiId, apiHash, {
          connectionRetries: 5,
          deviceModel: 'RA SEBI Compliance Portal'
        });
        await client.connect();
      }

      // Perform sign in
      let loggedUser: any = null;
      try {
        loggedUser = await client.signInUser(
          {
            apiId,
            apiHash
          },
          {
            phoneNumber,
            phoneCode: async () => phoneCode.trim(),
            password: password ? async () => password : undefined,
            onError: (err: Error) => {
              throw err;
            }
          }
        );
      } catch (signInErr: any) {
        // Check if 2FA password is required
        if (signInErr?.errorMessage === 'SESSION_PASSWORD_NEEDED' || signInErr?.message?.includes('2FA') || signInErr?.message?.includes('PASSWORD')) {
          if (!password) {
            return {
              success: false,
              error: '2FA_PASSWORD_REQUIRED: Two-Step Verification Password is required for this Telegram account.'
            };
          }
        }
        throw signInErr;
      }

      // Export session string
      const sessionString = client.session.save() as unknown as string;

      // Extract user info
      const me: any = await client.getMe();
      const telegramUserInfo = {
        id: String(me?.id || loggedUser?.id || ''),
        firstName: me?.firstName || loggedUser?.firstName || 'Telegram Admin',
        lastName: me?.lastName || loggedUser?.lastName || '',
        username: me?.username || loggedUser?.username || null,
        phone: me?.phone || phoneNumber
      };

      // Save into Tenant document
      const updateData: any = {
        telegramPhone: phoneNumber,
        telegramSession: sessionString,
        telegramUser: telegramUserInfo
      };

      let updated = false;
      if (tenantId) {
        if (dynamicDb?.Tenant && mongoose.Types.ObjectId.isValid(tenantId)) {
          const res = await dynamicDb.Tenant.findByIdAndUpdate(tenantId, { $set: updateData }, { returnDocument: 'after' });
          if (res) updated = true;
        }
        if (!updated && dynamicDb?.Tenant) {
          const res = await dynamicDb.Tenant.findOneAndUpdate(
            { $or: [{ id: tenantId }, { tenantId: tenantId }] },
            { $set: updateData },
            { returnDocument: 'after' }
          );
          if (res) updated = true;
        }
        if (centralModels?.Tenant && mongoose.Types.ObjectId.isValid(tenantId)) {
          await centralModels.Tenant.findByIdAndUpdate(tenantId, { $set: updateData });
        }
      }

      if (!updated) {
        if (dynamicDb?.Tenant) {
          await dynamicDb.Tenant.findOneAndUpdate({ deletedAt: null }, { $set: updateData }, { returnDocument: 'after' });
        }
        if (centralModels?.Tenant) {
          await centralModels.Tenant.findOneAndUpdate({ deletedAt: null }, { $set: updateData }, { returnDocument: 'after' });
        }
      }

      // Clean up in-memory pending auth
      this.pendingAuthMap.delete(phoneNumber);

      // Automatically sync admin channels/groups into system
      let syncedCount = 0;
      if (tenantId) {
        try {
          const syncResult = await this.syncUserGroupsWithClient(client, tenantId, userId);
          syncedCount = syncResult.syncedCount;
        } catch (syncErr: any) {
          console.warn('[TelegramMtprotoService] Initial group sync warning:', syncErr.message);
        }
      }

      return {
        success: true,
        user: telegramUserInfo,
        sessionString,
        syncedGroupsCount: syncedCount
      };
    } catch (err: any) {
      console.error('[TelegramMtprotoService] verifyPhoneCode error:', err);
      const errMsg = err?.errorMessage || err?.message || 'Verification failed';
      return { success: false, error: errMsg };
    }
  }

  /**
   * Helper to retrieve tenant document reliably with fallbacks
   */
  public async getTenantRecord(tenantId?: string): Promise<any> {
    let tenant: any = null;
    if (tenantId && dynamicDb?.Tenant) {
      try {
        if (mongoose.Types.ObjectId.isValid(tenantId)) {
          tenant = await dynamicDb.Tenant.findById(tenantId).lean();
        }
      } catch {}
      if (!tenant) {
        try {
          tenant = await dynamicDb.Tenant.findOne({ $or: [{ id: tenantId }, { tenantId: tenantId }] }).lean();
        } catch {}
      }
    }
    if (!tenant && tenantId && centralModels?.Tenant) {
      try {
        if (mongoose.Types.ObjectId.isValid(tenantId)) {
          tenant = await centralModels.Tenant.findById(tenantId).lean();
        }
      } catch {}
    }
    // If not found or tenant doesn't have telegramSession, check if any tenant document has telegramSession
    if (!tenant || !tenant.telegramSession) {
      if (dynamicDb?.Tenant) {
        const withSession = await dynamicDb.Tenant.findOne({ telegramSession: { $exists: true, $ne: null } }).lean();
        if (withSession) tenant = withSession;
      }
    }
    if (!tenant || !tenant.telegramSession) {
      if (centralModels?.Tenant) {
        const withSession = await centralModels.Tenant.findOne({ telegramSession: { $exists: true, $ne: null } }).lean();
        if (withSession) tenant = withSession;
      }
    }
    if (!tenant) {
      if (dynamicDb?.Tenant) tenant = await dynamicDb.Tenant.findOne({ deletedAt: null }).lean();
      if (!tenant && centralModels?.Tenant) tenant = await centralModels.Tenant.findOne({ deletedAt: null }).lean();
    }
    return tenant;
  }

  /**
   * Helper to initialize connected client for tenant
   */
  public async getConnectedClient(tenantId?: string): Promise<{ client: TelegramClient; sessionString: string } | null> {
    try {
      const tenant = await this.getTenantRecord(tenantId);
      const sessionString = tenant?.telegramSession;
      if (!sessionString) {
        return null;
      }

      const { apiId, apiHash } = await this.getApiCredentials(tenantId);
      const stringSession = new StringSession(sessionString);
      const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
        deviceModel: 'RA SEBI Compliance Portal'
      });

      await client.connect();
      return { client, sessionString };
    } catch (err: any) {
      console.error('[TelegramMtprotoService] Failed to initialize connected client:', err.message);
      return null;
    }
  }

  /**
   * Fetch all channels / supergroups where the logged-in admin is Admin or Creator
   */
  public async fetchAdminChannelsAndGroups(tenantId?: string): Promise<{
    success: boolean;
    groups?: TelegramAdminDialog[];
    error?: string;
  }> {
    try {
      const conn = await this.getConnectedClient(tenantId);
      if (!conn) {
        return {
          success: false,
          error: 'No active Telegram Phone session connected. Please connect your Telegram account first.'
        };
      }

      const { client } = conn;
      const dialogs = await client.getDialogs({ limit: 100 });

      const results: TelegramAdminDialog[] = [];

      for (const d of dialogs) {
        const entity: any = d.entity;
        if (!entity) continue;

        const isChannel = d.isChannel || entity.className === 'Channel';
        const isGroup = d.isGroup || entity.className === 'Chat';

        if (!isChannel && !isGroup) continue;

        const isCreator = Boolean(entity.creator);
        const isAdmin = Boolean(entity.adminRights || entity.creator || d.title);
        const isBroadcast = Boolean(entity.broadcast);
        const isMegagroup = Boolean(entity.megagroup);

        // Standard Bot API Chat ID calculation:
        // Channels & Supergroups: -100 + entity.id
        // Basic groups: - + entity.id
        let rawId = String(entity.id);
        let botChatId = '';

        if (rawId.startsWith('-100')) {
          botChatId = rawId;
        } else if (rawId.startsWith('-')) {
          botChatId = rawId;
        } else if (isChannel || isMegagroup || isBroadcast) {
          botChatId = `-100${rawId}`;
        } else {
          botChatId = `-${rawId}`;
        }

        let type: 'supergroup' | 'channel' | 'group' = 'supergroup';
        if (isBroadcast) {
          type = 'channel';
        } else if (isGroup && !isMegagroup) {
          type = 'group';
        }

        const name = entity.title || d.title || `Telegram ${type}`;
        const username = entity.username || null;
        const memberCount = entity.participantsCount || null;
        let inviteLink: string | null = username ? `https://t.me/${username}` : null;

        results.push({
          chatId: botChatId,
          name,
          type,
          username,
          memberCount,
          isCreator,
          isAdmin,
          inviteLink
        });
      }

      return {
        success: true,
        groups: results
      };
    } catch (err: any) {
      console.error('[TelegramMtprotoService] fetchAdminChannelsAndGroups error:', err);
      return { success: false, error: err?.message || 'Failed to fetch Telegram dialogs' };
    }
  }

  /**
   * Synchronize fetched admin groups into `TelegramGroup` collection
   */
  public async syncUserGroupsWithClient(
    client: TelegramClient,
    tenantId: string,
    userId?: string
  ): Promise<{ syncedCount: number; groups: any[] }> {
    const dialogs = await client.getDialogs({ limit: 100 });
    let syncedCount = 0;
    const syncedGroups: any[] = [];

    const existingGroups = dynamicDb?.TelegramGroup
      ? await dynamicDb.TelegramGroup.find({ tenantId, deletedAt: null }).lean()
      : [];
    const existingMap = new Map<string, any>(existingGroups.map((g: any) => [String(g.chatId), g]));

    for (const d of dialogs) {
      const entity: any = d.entity;
      if (!entity) continue;

      const isChannel = d.isChannel || entity.className === 'Channel';
      const isGroup = d.isGroup || entity.className === 'Chat';
      if (!isChannel && !isGroup) continue;

      const isBroadcast = Boolean(entity.broadcast);
      const isMegagroup = Boolean(entity.megagroup);

      let rawId = String(entity.id);
      let botChatId = '';
      if (rawId.startsWith('-100') || rawId.startsWith('-')) {
        botChatId = rawId;
      } else if (isChannel || isMegagroup || isBroadcast) {
        botChatId = `-100${rawId}`;
      } else {
        botChatId = `-${rawId}`;
      }

      let type: 'supergroup' | 'channel' | 'group' = 'supergroup';
      if (isBroadcast) type = 'channel';
      else if (isGroup && !isMegagroup) type = 'group';

      const name = entity.title || d.title || `Telegram ${type}`;
      const username = entity.username || null;
      const memberCount = entity.participantsCount || 0;
      let inviteLink = username ? `https://t.me/${username}` : null;

      // Check if already in database
      const existing = existingMap.get(botChatId);

      if (existing && dynamicDb?.TelegramGroup) {
        await dynamicDb.TelegramGroup.findByIdAndUpdate(existing._id, {
          $set: {
            name,
            type,
            username: username || existing.username,
            memberCount: memberCount || existing.memberCount,
            inviteLink: existing.inviteLink || inviteLink
          }
        });
        syncedCount++;
        syncedGroups.push({ ...existing, name, type, memberCount });
      } else if (dynamicDb?.TelegramGroup && mongoose.Types.ObjectId.isValid(tenantId)) {
        const created = await dynamicDb.TelegramGroup.create({
          tenantId: new mongoose.Types.ObjectId(tenantId),
          name,
          chatId: botChatId,
          inviteLink,
          type,
          username,
          memberCount,
          isDefault: existingGroups.length === 0 && syncedCount === 0,
          status: 'ACTIVE',
          createdById: userId && mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null
        });
        syncedCount++;
        syncedGroups.push(created.toObject ? created.toObject() : created);
      }
    }

    // If tenant has no default telegramChatId configured, set the first synced group
    if (syncedGroups.length > 0 && dynamicDb?.Tenant) {
      try {
        const tenant = await dynamicDb.Tenant.findById(tenantId);
        if (tenant && !tenant.telegramChatId) {
          tenant.telegramChatId = syncedGroups[0].chatId;
          if (syncedGroups[0].inviteLink && !tenant.telegramInviteLink) {
            tenant.telegramInviteLink = syncedGroups[0].inviteLink;
          }
          await tenant.save();
        }
      } catch {}
    }

    return { syncedCount, groups: syncedGroups };
  }

  /**
   * Sync all groups for tenant using saved session
   */
  public async syncTenantGroups(
    tenantId: string,
    userId?: string
  ): Promise<{ success: boolean; syncedCount: number; groups?: any[]; error?: string }> {
    try {
      const conn = await this.getConnectedClient(tenantId);
      if (!conn) {
        return {
          success: false,
          syncedCount: 0,
          error: 'No active Telegram Phone session found for this tenant.'
        };
      }

      const syncResult = await this.syncUserGroupsWithClient(conn.client, tenantId, userId);
      return {
        success: true,
        syncedCount: syncResult.syncedCount,
        groups: syncResult.groups
      };
    } catch (err: any) {
      console.error('[TelegramMtprotoService] syncTenantGroups error:', err);
      return {
        success: false,
        syncedCount: 0,
        error: err.message || 'Failed to sync groups from Telegram session'
      };
    }
  }

  /**
   * STEP 3: Create a brand new Telegram Channel / Supergroup directly on Admin's Telegram Account!
   */
  public async createChannelOnAccount(options: {
    tenantId: string;
    title: string;
    about?: string;
    isBroadcast?: boolean;
    assignedPlanId?: string;
    userId?: string;
  }): Promise<{
    success: boolean;
    channel?: any;
    group?: any;
    error?: string;
  }> {
    const { tenantId, title, about, isBroadcast = true, assignedPlanId, userId } = options;

    try {
      const conn = await this.getConnectedClient(tenantId);
      if (!conn) {
        return {
          success: false,
          error: 'No active Telegram Phone session found. Please connect your Telegram Phone number first.'
        };
      }

      const { client } = conn;

      // 1. Invoke Telegram MTProto to create channel
      const result: any = await client.invoke(
        new Api.channels.CreateChannel({
          title: title.trim(),
          about: about?.trim() || 'Official Trading & Market Advisory Signal Channel',
          broadcast: isBroadcast,
          megagroup: !isBroadcast
        })
      );

      const createdChat: any = result?.chats && result.chats.length > 0 ? result.chats[0] : null;
      if (!createdChat) {
        return {
          success: false,
          error: 'Telegram did not return created channel details.'
        };
      }

      const rawId = String(createdChat.id);
      const botChatId = `-100${rawId}`;
      const groupType = isBroadcast ? 'channel' : 'supergroup';

      // 2. Export Invite Link for the newly created channel
      let inviteLink: string | null = null;
      try {
        const inviteRes: any = await client.invoke(
          new Api.messages.ExportChatInvite({
            peer: createdChat
          })
        );
        if (inviteRes?.link) {
          inviteLink = inviteRes.link;
        }
      } catch (invErr: any) {
        console.warn('[TelegramMtprotoService] Could not export chat invite link:', invErr.message);
      }

      // 2b. Automatically invite and promote the tenant safe Bot to Admin if bot is configured!
      try {
        const config = await telegramService.getConfig(tenantId);
        if (config.botToken) {
          const axios = (await import('axios')).default;
          const botRes = await axios.get(`https://api.telegram.org/bot${config.botToken}/getMe`, { timeout: 5000 });
          const botUsername = botRes.data?.result?.username;
          if (botUsername) {
            try {
              const botPeer: any = await client.getInputEntity(botUsername);
              try {
                await client.invoke(
                  new Api.channels.InviteToChannel({
                    channel: createdChat,
                    users: [botPeer]
                  })
                );
              } catch (invErr: any) {
                console.warn('[TelegramMtprotoService] InviteToChannel note:', invErr.message);
              }

              await client.invoke(
                new Api.channels.EditAdmin({
                  channel: createdChat,
                  userId: botPeer,
                  adminRights: new Api.ChatAdminRights({
                    changeInfo: true,
                    postMessages: true,
                    editMessages: true,
                    deleteMessages: true,
                    banUsers: true,
                    inviteUsers: true,
                    pinMessages: true,
                    addAdmins: false,
                    anonymous: false,
                    manageCall: true,
                    other: true
                  }),
                  rank: 'Broadcast Bot'
                })
              );
              console.log(`[TelegramMtprotoService] Bot @${botUsername} automatically promoted to Admin in ${title}`);
            } catch (adminErr: any) {
              console.warn('[TelegramMtprotoService] EditAdmin warning:', adminErr.message);
            }
          }
        }
      } catch (botErr: any) {
        console.warn('[TelegramMtprotoService] Auto-bot assignment notice:', botErr.message);
      }

      // 3. Save into TelegramGroup collection
      let savedGroup: any = null;
      if (dynamicDb?.TelegramGroup && mongoose.Types.ObjectId.isValid(tenantId)) {
        savedGroup = await dynamicDb.TelegramGroup.create({
          tenantId: new mongoose.Types.ObjectId(tenantId),
          name: title.trim(),
          chatId: botChatId,
          inviteLink: inviteLink || null,
          type: groupType,
          username: createdChat.username || null,
          memberCount: 1,
          isDefault: false,
          status: 'ACTIVE',
          createdById: userId && mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null
        });
      }

      // 4. Auto-map to Plan if assignedPlanId was specified
      if (assignedPlanId && dynamicDb?.Plan) {
        try {
          await dynamicDb.Plan.findByIdAndUpdate(assignedPlanId, {
            $set: {
              telegramChatId: botChatId,
              telegramGroupName: title.trim(),
              telegramInviteLink: inviteLink || null
            }
          });
        } catch (planErr: any) {
          console.warn('[TelegramMtprotoService] Could not auto-map to plan:', planErr.message);
        }
      }

      return {
        success: true,
        channel: {
          id: botChatId,
          title: title.trim(),
          inviteLink,
          type: groupType
        },
        group: savedGroup?.toObject ? savedGroup.toObject() : savedGroup
      };
    } catch (err: any) {
      console.error('[TelegramMtprotoService] createChannelOnAccount error:', err);
      return {
        success: false,
        error: err?.errorMessage || err?.message || 'Failed to create Telegram channel on account'
      };
    }
  }

  /**
   * Disconnect Telegram Phone session
   */
  public async disconnect(tenantId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const resetFields: any = {
        telegramPhone: null,
        telegramSession: null,
        telegramUser: null
      };

      if (dynamicDb?.Tenant && mongoose.Types.ObjectId.isValid(tenantId)) {
        await dynamicDb.Tenant.findByIdAndUpdate(tenantId, { $set: resetFields });
      } else if (dynamicDb?.Tenant) {
        await dynamicDb.Tenant.findOneAndUpdate(
          { $or: [{ id: tenantId }, { tenantId: tenantId }] },
          { $set: resetFields }
        );
      }
      if (centralModels?.Tenant && mongoose.Types.ObjectId.isValid(tenantId)) {
        await centralModels.Tenant.findByIdAndUpdate(tenantId, { $set: resetFields });
      }

      return { success: true };
    } catch (err: any) {
      console.error('[TelegramMtprotoService] disconnect error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Get Telegram phone connection status
   */
  public async getAuthStatus(tenantId?: string): Promise<{
    isConnected: boolean;
    phone: string | null;
    user: any | null;
    hasSession: boolean;
  }> {
    try {
      const tenant = await this.getTenantRecord(tenantId);
      const isConnected = Boolean(tenant?.telegramSession && tenant?.telegramPhone);
      return {
        isConnected,
        phone: tenant?.telegramPhone || null,
        user: tenant?.telegramUser || null,
        hasSession: Boolean(tenant?.telegramSession)
      };
    } catch (err: any) {
      return {
        isConnected: false,
        phone: null,
        user: null,
        hasSession: false
      };
    }
  }
}

export const telegramMtprotoService = TelegramMtprotoService.getInstance();
export default telegramMtprotoService;
