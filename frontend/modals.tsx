                        triggerAlert('Please upload the SEBI Certificate PDF first to extract and auto-fill details.');
                      }
                    }} onChange={e => setCompanyType(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors h-[42px]">
                      <option value="INDIVIDUAL">Individual</option>
                      <option value="SOLE_PROPRIETORSHIP">Sole Proprietorship</option>
                      <option value="PARTNERSHIP">Partnership</option>
                      <option value="LLP">LL.P</option>
                      <option value="PVT_LTD">Pvt. Ltd.</option>
                      <option value="PUBLIC_LTD">Public Ltd.</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">RA Type *</label>
                    <select value={raType} onFocus={(e) => {
                      if (!sebiCertificate) {
                        e.target.blur();
                        triggerAlert('Please upload the SEBI Certificate PDF first to extract and auto-fill details.');
                      }
                    }} onChange={e => setRaType(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors h-[42px]">
                      <option value="FULL_TIME">Full Time RA</option>
                      <option value="PART_TIME">Part Time RA</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Owner / Admin Name *</label>
                    <input type="text" required value={ownerName} onFocus={(e) => {
                      if (!sebiCertificate) {
                        e.target.blur();
                        triggerAlert('Please upload the SEBI Certificate PDF first to extract and auto-fill details.');
                      }
                    }} onChange={e => setOwnerName(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">SEBI Registration No *</label>
                    {parsedFields.sebiRegistration ? (
                      <div className="w-full bg-primary-500/10 border border-primary-500/20 rounded-xl py-2.5 px-4 text-sm text-primary-600 dark:text-primary-400 font-bold flex items-center shadow-inner h-[42px] uppercase">
                        {sebiRegistration}
                      </div>
                    ) : (
                      <div className="relative">
                        <input type="text" required value={sebiRegistration} onFocus={(e) => {
                          if (!sebiCertificate) {
                            e.target.blur();
                            triggerAlert('Please upload the SEBI Certificate PDF first to extract and auto-fill details.');
                          }
                        }} onChange={e => setSebiRegistration(e.target.value.toUpperCase())} className={`w-full bg-slate-100 dark:bg-slate-950/50 border ${duplicateFields.includes('SEBI Registration') ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-400 dark:border-white/10'} rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors uppercase font-mono`}
                          placeholder="INZ000000000"
                        />
                        {duplicateFields.includes('SEBI Registration') && <p className="text-rose-500 text-xs mt-1 font-semibold">This SEBI Registration already exists.</p>}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Admin Email *</label>
                    <div className="relative">
                      <input type="email" required value={email} onFocus={(e) => {
                        if (!sebiCertificate) {
                          e.target.blur();
                          triggerAlert('Please upload the SEBI Certificate PDF first to extract and auto-fill details.');
                        }
                      }} onChange={e => setEmail(e.target.value)} className={`w-full bg-slate-100 dark:bg-slate-950/50 border ${duplicateFields.includes('Email') ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-400 dark:border-white/10'} rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors`}
                        placeholder="name@company.com" />
                      {duplicateFields.includes('Email') && <p className="text-rose-500 text-xs mt-1 font-semibold">This Email is already associated with another company.</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Mobile Number *</label>
                    <div className="relative">
                      <input type="text" required value={mobile} onFocus={(e) => {
                        if (!sebiCertificate) {
                          e.target.blur();
                          triggerAlert('Please upload the SEBI Certificate PDF first to extract and auto-fill details.');
                        }
                      }} onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} className={`w-full bg-slate-100 dark:bg-slate-950/50 border ${duplicateFields.includes('Mobile') ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-400 dark:border-white/10'} rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors`}
                        placeholder="9876543210" />
                      {duplicateFields.includes('Mobile') && <p className="text-rose-500 text-xs mt-1 font-semibold">This Mobile number already exists.</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Company PAN *</label>
                    <div className="relative">
                      <input type="text" required value={pan} onFocus={() => {
                        if (duplicateFields.includes('PAN')) {
                          setDuplicateFields(duplicateFields.filter(f => f !== 'PAN'));
                        }
                      }} onChange={e => setPan(formatPan(e.target.value))} className={`w-full bg-slate-100 dark:bg-slate-950/50 border ${duplicateFields.includes('PAN') ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-400 dark:border-white/10'} rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors uppercase`}
                        placeholder="ABCDE1234F" />
                      {duplicateFields.includes('PAN') && <p className="text-rose-500 text-xs mt-1 font-semibold">This PAN already exists.</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">GST Identification</label>
                    <div className="relative">
                      <input type="text" value={gst} onFocus={(e) => {
                        if (!sebiCertificate) {
                          e.target.blur();
                          triggerAlert('Please upload the SEBI Certificate PDF first to extract and auto-fill details.');
                        }
                      }} onChange={e => setGst(e.target.value.toUpperCase())} className={`w-full bg-slate-100 dark:bg-slate-950/50 border ${duplicateFields.includes('GST') ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-400 dark:border-white/10'} rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors`}
                        placeholder="Optional" />
                      {duplicateFields.includes('GST') && <p className="text-rose-500 text-xs mt-1 font-semibold">This GST already exists.</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Website URL</label>
                    <input type="url" value={website} onFocus={(e) => {
                      if (!sebiCertificate) {
                        e.target.blur();
                        triggerAlert('Please upload the SEBI Certificate PDF first to extract and auto-fill details.');
                      }
                    }} onChange={e => setWebsite(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors" placeholder="https://..." />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">BSE Enrollment Code</label>
                    <input type="text" value={bseEnrollment} onFocus={(e) => {
                      if (!sebiCertificate) {
                        e.target.blur();
                        triggerAlert('Please upload the SEBI Certificate PDF first to extract and auto-fill details.');
                      }
                    }} onChange={e => setBseEnrollment(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors" placeholder="Optional" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">SEBI Validity Date *</label>
                    {parsedFields.certificateValidity ? (
                      <div className="w-full bg-primary-500/10 border border-primary-500/20 rounded-xl py-2.5 px-4 text-sm text-primary-600 dark:text-primary-400 font-bold flex items-center shadow-inner h-[42px]">
                        {certificateValidity}
                      </div>
                    ) : (
                      <input type="date" required value={certificateValidity} onFocus={(e) => {
                        if (!sebiCertificate) {
                          e.target.blur();
                          triggerAlert('Please upload the SEBI Certificate PDF first to extract and auto-fill details.');
                        }
                      }} onChange={e => setCertificateValidity(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors" />
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">NISM Validity Date *</label>
                    <input type="date" required value={nismValidity} onFocus={(e) => {
                      if (!nismCertificate) {
                        e.target.blur();
                        triggerAlert('Please upload the NISM Certificate PDF first to extract and auto-fill NISM Validity.');
                      }
                    }} onChange={e => setNismValidity(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Deposit Float (INR) *</label>
                    <input type="number" required value={depositAmount} onFocus={(e) => {
                      if (!sebiCertificate) {
                        e.target.blur();
                        triggerAlert('Please upload the SEBI Certificate PDF first to extract and auto-fill details.');
                      }
                    }} onChange={e => setDepositAmount(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors" />
                  </div>
                  <div className="col-span-1 md:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Corporate Office Address *</label>
                    {parsedFields.address ? (
                      <div className="w-full bg-primary-500/10 border border-primary-500/20 rounded-xl py-2.5 px-4 text-sm text-primary-600 dark:text-primary-400 font-bold shadow-inner min-h-[42px]">
                        {address}
                      </div>
                    ) : (
                      <input type="text" required value={address} onFocus={(e) => {
                        if (!sebiCertificate) {
                          e.target.blur();
                          triggerAlert('Please upload the SEBI Certificate PDF first to extract and auto-fill details.');
                        }
                      }} onChange={e => setAddress(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 transition-colors" placeholder="BKC Commercial Towers..." />
                    )}
                  </div>
                  <div className="col-span-1 md:col-span-3 grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">SEBI Certificate File * {isParsingPdf && <span className="text-primary-600 dark:text-primary-400 ml-2">(Parsing PDF...)</span>}</label>
                      {sebiCertificate ? (
                        <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl py-2 px-4 text-xs text-emerald-600 dark:text-emerald-400 font-bold min-h-[42px]">
                          <span className="truncate max-w-[200px]">{sebiCertificate.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSebiCertificate(null);
                              setCompanyName('');
                              setSebiRegistration('');
                              setCertificateValidity('');
                              setAddress('');
                              setParsedFields({ companyName: false, sebiRegistration: false, certificateValidity: false, address: false });
                              setIsDocumentValid(null);
                            }}
                            className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-[10px] text-emerald-600 dark:text-emerald-400 rounded transition-colors"
                          >
                            Reupload
                          </button>
                        </div>
                      ) : (
                        <input type="file" ref={sebiFileInputRef} required onChange={handleSebiCertificateChange} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-4 text-sm text-slate-600 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-500/10 file:text-primary-600 dark:text-primary-400 hover:file:bg-primary-500/20" accept=".pdf" />
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">NISM certificate of PO/Researcher *</label>
                      {nismCertificate ? (
                        <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-xl py-2 px-4 text-xs text-emerald-600 dark:text-emerald-400 font-bold min-h-[42px]">
                          <span className="truncate max-w-[200px]">{nismCertificate.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setNismCertificate(null);
                              setNismValidity('');
                            }}
                            className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-[10px] text-emerald-600 dark:text-emerald-400 rounded transition-colors"
                          >
                            Reupload
                          </button>
                        </div>
                      ) : (
                        <input type="file" ref={nismFileInputRef} required onChange={handleNismCertificateChange} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-4 text-sm text-slate-600 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-500/10 file:text-primary-600 dark:text-primary-400 hover:file:bg-primary-500/20" accept=".pdf" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-slate-300 dark:border-white/5">
                  <button type="button" onClick={() => setIsAddCompanyModalOpen(false)} className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 text-sm font-bold rounded-xl transition-colors text-slate-700 dark:text-slate-300">
                    Cancel
                  </button>
                  <button type="submit" disabled={formLoading} className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-sm font-bold rounded-xl transition-all shadow-lg shadow-primary-500/20 flex items-center space-x-2 text-white disabled:opacity-50">
                    {formLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    <span>Onboard & Setup Company</span>
                  </button>
                </div>
              </form>
            )}

            {formSuccess && (
              <div className="flex justify-end pt-6 border-t border-slate-300 dark:border-white/5">
                <button type="button" onClick={() => setIsAddCompanyModalOpen(false)} className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-sm font-bold rounded-xl transition-colors text-white">
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative text-center animate-in zoom-in-95 duration-200">
            <AlertTriangle className="h-12 w-12 text-amber-600 dark:text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Confirm Action</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Are you sure you want to {confirmAction?.type.toLowerCase().replace('_', ' ')} this tenant?</p>
            <div className="flex justify-center space-x-3">
              <button onClick={() => setIsConfirmModalOpen(false)} className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 text-sm font-bold rounded-xl transition-colors text-slate-700 dark:text-slate-300">Cancel</button>
              <button onClick={executeConfirmAction} className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-sm font-bold rounded-xl transition-colors text-white shadow-lg shadow-primary-500/20">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Password Prompt Modal */}
      {isPasswordPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative text-center animate-in zoom-in-95 duration-200">
            <Key className="h-12 w-12 text-primary-600 dark:text-primary-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Please enter your Super Admin password to proceed.</p>
            <div className="mb-6 text-left">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Key className="h-4 w-4" />
                </span>
                <input
                  type="password" required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-primary-500 transition placeholder:text-slate-500"
                  placeholder="Enter your password"
                />
              </div>
            </div>
            <div className="flex justify-center space-x-3">
              <button onClick={() => setIsPasswordPromptOpen(false)} className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 text-sm font-bold rounded-xl transition-colors text-slate-700 dark:text-slate-300">Cancel</button>
              <button
                onClick={() => {
                  if (!confirmPassword) {
                    triggerAlert('Please enter your password.');
                    return;
                  }
                  setIsPasswordPromptOpen(false);
                  setIsConfirmModalOpen(true);
                }}
                className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-sm font-bold rounded-xl transition-colors text-white shadow-lg shadow-primary-500/20"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {isViewModalOpen && viewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative text-left animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsViewModalOpen(false)} className="absolute top-6 right-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors bg-slate-100 dark:bg-white/5 p-2 rounded-full">
              <XCircle className="h-5 w-5" />
            </button>
            <h2 className="text-2xl font-bold mb-6">Tenant Details</h2>
            <div className="space-y-6">
              <div className="bg-slate-100 dark:bg-slate-950/50 p-5 rounded-xl border border-slate-300 dark:border-white/5">
                <h3 className="text-sm font-bold text-primary-600 dark:text-primary-400 mb-4 uppercase tracking-wider">Company Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-slate-500 block text-xs">Name</span>{viewData.tenant?.companyName || 'N/A'}</div>
                  <div><span className="text-slate-500 block text-xs">SEBI Reg</span>{viewData.tenant?.sebiRegistration || 'N/A'}</div>
                  <div><span className="text-slate-500 block text-xs">PAN</span>{viewData.tenant?.pan || 'N/A'}</div>
                  <div><span className="text-slate-500 block text-xs">GST</span>{viewData.tenant?.gst || 'N/A'}</div>
                  <div className="col-span-2"><span className="text-slate-500 block text-xs">Address</span>{viewData.tenant?.address || 'N/A'}</div>
                </div>
              </div>
              <div className="bg-slate-100 dark:bg-slate-950/50 p-5 rounded-xl border border-slate-300 dark:border-white/5">
                <h3 className="text-sm font-bold text-emerald-600 dark:emerald-400 mb-4 uppercase tracking-wider">Admin User</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-slate-500 block text-xs">Name</span>{viewData.admin?.firstName} {viewData.admin?.lastName}</div>
                  <div><span className="text-slate-500 block text-xs">Email</span>{viewData.admin?.email}</div>
                  <div><span className="text-slate-500 block text-xs">Mobile</span>{viewData.admin?.mobile || 'N/A'}</div>
                  <div><span className="text-slate-500 block text-xs">Status</span>{viewData.admin?.status}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Rule Modal */}
      {isEditRuleModalOpen && editRuleData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl p-8 w-full max-w-lg shadow-2xl relative text-left animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsEditRuleModalOpen(false)} className="absolute top-6 right-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors bg-slate-100 dark:bg-white/5 p-2 rounded-full">
              <XCircle className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">Edit Compliance Rule #{editRuleData.serialNo}</h2>
            <form onSubmit={handleEditRuleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Requirement Description</label>
                <textarea
                  rows={3}
                  value={editRuleData.requirement}
                  onChange={e => setEditRuleData({ ...editRuleData, requirement: e.target.value })}
                  className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white focus:border-primary-500 transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Frequency</label>
                  <input type="text" value={editRuleData.frequency} onChange={e => setEditRuleData({ ...editRuleData, frequency: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Severity Level</label>
                  <select value={editRuleData.severityLevel} onChange={e => setEditRuleData({ ...editRuleData, severityLevel: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white appearance-none">
                    <option value="HIGH">HIGH</option>
                    <option value="MODERATE">MODERATE</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Penalty Amount / Action</label>
                <input type="text" value={editRuleData.penaltyAmount || ''} onChange={e => setEditRuleData({ ...editRuleData, penaltyAmount: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" placeholder="e.g. Γé╣10,000 per violation" />
              </div>
              <div className="flex items-center space-x-3 pt-2">
                <input type="checkbox" id="isActive" checked={editRuleData.isActive} onChange={e => setEditRuleData({ ...editRuleData, isActive: e.target.checked })} className="h-4 w-4 rounded border-slate-400 dark:border-white/10 bg-slate-100 dark:bg-slate-950 text-primary-600 dark:text-primary-500 focus:ring-primary-500 focus:ring-offset-slate-900" />
                <label htmlFor="isActive" className="text-sm font-bold text-slate-700 dark:text-slate-300">Rule is Active (Generates Alerts/Penalties)</label>
              </div>
              <div className="pt-4 flex space-x-4">
                <button type="submit" className="flex-1 bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 rounded-xl transition-all">Save Rule Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative text-left animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsEditModalOpen(false)} className="absolute top-6 right-6 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors bg-slate-100 dark:bg-white/5 p-2 rounded-full">
              <XCircle className="h-5 w-5" />
            </button>
            <h2 className="text-2xl font-bold mb-6">Edit Tenant</h2>
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Company Name</label>
                  <input type="text" value={editData.companyName} onChange={e => setEditData({ ...editData, companyName: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Company Type</label>
                  <select value={editData.companyType} onChange={e => setEditData({ ...editData, companyType: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white h-[38px]">
                    <option value="INDIVIDUAL">Individual</option>
                    <option value="SOLE_PROPRIETORSHIP">Sole Proprietorship</option>
                    <option value="PARTNERSHIP">Partnership</option>
                    <option value="LLP">LL.P</option>
                    <option value="PVT_LTD">Pvt. Ltd.</option>
                    <option value="PUBLIC_LTD">Public Ltd.</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">RA Type</label>
                  <select value={editData.raType} onChange={e => setEditData({ ...editData, raType: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white h-[38px]">
                    <option value="FULL_TIME">Full Time RA</option>
                    <option value="PART_TIME">Part Time RA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">SEBI Registration</label>
                  <input type="text" value={editData.sebiRegistration} onChange={e => setEditData({ ...editData, sebiRegistration: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">BSE Enrollment No</label>
                  <input type="text" value={editData.bseEnrollment} onChange={e => setEditData({ ...editData, bseEnrollment: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">PAN</label>
                  <input type="text" value={editData.pan} onChange={e => setEditData({ ...editData, pan: formatPan(e.target.value) })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Website</label>
                  <input type="text" value={editData.website} onChange={e => setEditData({ ...editData, website: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">SEBI Validity Date</label>
                  <input type="date" value={editData.certificateValidity} onChange={e => setEditData({ ...editData, certificateValidity: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">NISM Validity Date</label>
                  <input type="date" value={editData.nismValidity} onChange={e => setEditData({ ...editData, nismValidity: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">GST</label>
                  <input type="text" value={editData.gst} onChange={e => setEditData({ ...editData, gst: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Company Mobile</label>
                  <input type="text" value={editData.tenantMobile} onChange={e => setEditData({ ...editData, tenantMobile: e.target.value.replace(/\D/g, '').slice(0, 10) })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Deposit Float (INR)</label>
                  <input type="number" value={editData.depositAmount} onChange={e => setEditData({ ...editData, depositAmount: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Address</label>
                  <input type="text" value={editData.address} onChange={e => setEditData({ ...editData, address: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" />
                </div>

                <div className="col-span-2 my-2 border-t border-slate-400 dark:border-white/10 pt-4">
                  <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-4">Certificates</h3>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">SEBI Certificate</label>
                  {editData.certificateUrl && (
                    <div className="mb-2">
                      <a href={`${api.getBaseUrl()}${editData.certificateUrl}`} target="_blank" rel="noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline text-xs">View Current SEBI Certificate</a>
                    </div>
                  )}
                  <input type="file" onChange={e => setEditSebiCertificate(e.target.files?.[0] || null)} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-600 dark:text-slate-400 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-500/10 file:text-primary-600 dark:text-primary-400" accept=".pdf" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">NISM Certificate</label>
                  {editData.nismCertificateUrl && (
                    <div className="mb-2">
                      <a href={`${api.getBaseUrl()}${editData.nismCertificateUrl}`} target="_blank" rel="noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline text-xs">View Current NISM Certificate</a>
                    </div>
                  )}
                  <input type="file" onChange={e => setEditNismCertificate(e.target.files?.[0] || null)} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-600 dark:text-slate-400 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-500/10 file:text-primary-600 dark:text-primary-400" accept=".pdf" />
                </div>

                {documentHistory.length > 0 && (
                  <div className="col-span-2 mt-4">
                    <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wider">Document Upload History</h4>
                    <div className="bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12 text-center">S.No</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>File Name</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {documentHistory.map((doc: any, index: number) => (
                            <TableRow key={doc.id}>
                              <TableCell className="text-center font-mono text-slate-500">{index + 1}</TableCell>
                              <TableCell className="whitespace-nowrap">{new Date(doc.uploadedAt).toLocaleString()}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${doc.docType === 'SEBI_CERTIFICATE' ? 'bg-primary-500/20 text-primary-600 dark:text-primary-400' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}>
                                  {doc.docType.replace('_', ' ')}
                                </span>
                              </TableCell>
                              <TableCell className="truncate max-w-[150px]" title={doc.fileName}>{doc.fileName}</TableCell>
                              <TableCell className="text-right">
                                <a href={`${api.getBaseUrl()}${doc.fileUrl}`} target="_blank" rel="noreferrer" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:text-primary-300 hover:underline font-semibold">Download</a>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                <div className="col-span-2 my-2 border-t border-slate-400 dark:border-white/10 pt-4">
                  <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-4">Admin Details</h3>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Admin Name</label>
                  <input type="text" value={editData.adminName} onChange={e => setEditData({ ...editData, adminName: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Admin Email</label>
                  <input type="email" value={editData.adminEmail} onChange={e => setEditData({ ...editData, adminEmail: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Admin Mobile</label>
                  <input type="text" value={editData.adminMobile} onChange={e => setEditData({ ...editData, adminMobile: e.target.value.replace(/\D/g, '').slice(0, 10) })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">New Password (leave blank to keep)</label>
                  <input type="password" value={editData.adminPassword} onChange={e => setEditData({ ...editData, adminPassword: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-950/50 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm text-slate-900 dark:text-white" placeholder="ΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇó" />
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-6 border-t border-slate-300 dark:border-white/5">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 text-sm font-bold rounded-xl transition-colors text-slate-700 dark:text-slate-300">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-sm font-bold rounded-xl transition-colors text-white shadow-lg shadow-primary-500/20">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logout Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative text-center animate-in zoom-in-95 duration-200">
            <LogOut className="h-12 w-12 text-rose-600 dark:text-rose-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Logout</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Are you sure you want to log out of the super admin console?</p>
            {user?.allowMultiDeviceLogin ? (
              <div className="flex flex-col space-y-3">
                <button onClick={() => handleLogout(false)} className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-sm font-bold rounded-xl transition-colors text-white shadow-lg shadow-rose-500/20">Sign out on this device</button>
                <button onClick={() => handleLogout(true)} className="w-full py-2.5 bg-rose-950/40 border border-rose-500/30 text-rose-500 hover:bg-rose-900/40 text-sm font-bold rounded-xl transition-colors">Sign out on ALL devices</button>
                <button onClick={() => setIsLogoutModalOpen(false)} className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 text-sm font-bold rounded-xl transition-colors text-slate-700 dark:text-slate-300 mt-2">Cancel</button>
              </div>
            ) : (
              <div className="flex justify-center space-x-3">
                <button onClick={() => setIsLogoutModalOpen(false)} className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 text-sm font-bold rounded-xl transition-colors text-slate-700 dark:text-slate-300">Cancel</button>
                <button onClick={() => handleLogout(false)} className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-sm font-bold rounded-xl transition-colors text-white shadow-lg shadow-rose-500/20">Log Out</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PDF Confirm Modal */}
      {showPdfConfirmModal && pdfPreviewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative text-center animate-in zoom-in-95 duration-200">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 dark:text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Valid Document Detected!</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">We extracted the following details. Please confirm to auto-fill the form.</p>
            <div className="bg-slate-100 dark:bg-slate-950/50 p-4 rounded-xl text-left text-sm space-y-4 mb-6 border border-slate-300 dark:border-white/5">
              <div>
                <label className="text-slate-500 block text-xs font-bold uppercase mb-1">Company Name</label>
                <input type="text" value={pdfPreviewData.companyName || ''} onChange={e => setPdfPreviewData({ ...pdfPreviewData, companyName: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-lg py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-slate-500 block text-xs font-bold uppercase mb-1">SEBI Reg No</label>
                <input type="text" value={pdfPreviewData.sebiRegistration || ''} onChange={e => setPdfPreviewData({ ...pdfPreviewData, sebiRegistration: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-lg py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 uppercase" />
              </div>
              <div>
                <label className="text-slate-500 block text-xs font-bold uppercase mb-1">Validity Date</label>
                <input type="date" value={pdfPreviewData.certificateValidity || ''} onChange={e => setPdfPreviewData({ ...pdfPreviewData, certificateValidity: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-lg py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500" />
              </div>
              <div>
                <label className="text-slate-500 block text-xs font-bold uppercase mb-1">Address</label>
                <textarea value={pdfPreviewData.address || ''} onChange={e => setPdfPreviewData({ ...pdfPreviewData, address: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-lg py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 min-h-[60px]" />
              </div>
            </div>
            <div className="flex justify-center space-x-3">
              <button onClick={() => { setShowPdfConfirmModal(false); setSebiCertificate(null); setIsDocumentValid(false); }} className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 text-sm font-bold rounded-xl transition-colors text-slate-700 dark:text-slate-300">Cancel</button>
              <button onClick={handleConfirmPdf} className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-sm font-bold rounded-xl transition-colors text-white shadow-lg shadow-primary-500/20">Confirm & Auto-Fill</button>
            </div>
          </div>
        </div>
      )}

      {/* NISM PDF Confirm Modal */}
      {showNismConfirmModal && nismPreviewData && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-2xl p-8 w-full max-w-sm shadow-2xl relative text-center animate-in zoom-in-95 duration-200">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 dark:text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">NISM Certificate Detected!</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">We extracted the following details. Please confirm to auto-fill the form.</p>
            <div className="bg-slate-100 dark:bg-slate-950/50 p-4 rounded-xl text-left text-sm space-y-4 mb-6 border border-slate-300 dark:border-white/5">
              <div>
                <label className="text-slate-500 block text-xs font-bold uppercase mb-1">NISM Reg No</label>
                <input type="text" value={nismPreviewData.nismRegistration || ''} onChange={e => setNismPreviewData({ ...nismPreviewData, nismRegistration: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-lg py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500 uppercase" />
              </div>
              <div>
                <label className="text-slate-500 block text-xs font-bold uppercase mb-1">Validity Date</label>
                <input type="date" value={nismPreviewData.nismValidity || ''} onChange={e => setNismPreviewData({ ...nismPreviewData, nismValidity: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-lg py-2 px-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary-500" />
              </div>
            </div>
            <div className="flex justify-center space-x-3">
              <button onClick={() => { setShowNismConfirmModal(false); setNismCertificate(null); }} className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 text-sm font-bold rounded-xl transition-colors text-slate-700 dark:text-slate-300">Cancel</button>
              <button onClick={handleConfirmNism} className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-sm font-bold rounded-xl transition-colors text-white shadow-lg shadow-primary-500/20">Confirm & Auto-Fill</button>
            </div>
          </div>
        </div>
      )}
      {/* Global Custom Alert Modal */}
      {globalAlert && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className={`border shadow-2xl rounded-2xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200 relative overflow-hidden ${globalAlert.isError ? 'bg-white dark:bg-slate-900 border-rose-500/30 shadow-rose-500/10' : 'bg-white dark:bg-slate-900 border-indigo-500/30 shadow-indigo-500/10'}`}>
            <div className={`absolute top-0 left-0 w-1.5 h-full ${globalAlert.isError ? 'bg-rose-500' : 'bg-indigo-500'}`}></div>
            <div className="flex items-start gap-4 pl-2">
              <div className={`p-2 rounded-xl mt-0.5 ${globalAlert.isError ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'}`}>
                {globalAlert.isError ? <AlertTriangle className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">{globalAlert.isError ? 'Error / Notice' : 'Notification'}</h3>
                <p className="text-[13px] text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">{globalAlert.message}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setGlobalAlert(null)} className={`px-5 py-2 text-xs font-bold text-white rounded-xl transition ${globalAlert.isError ? 'bg-rose-600 hover:bg-rose-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default dynamic(() => Promise.resolve(SuperAdminDashboardContent), { ssr: false });



