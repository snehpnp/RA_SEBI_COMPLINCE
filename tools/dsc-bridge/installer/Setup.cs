using System;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Diagnostics;
using System.Windows.Forms;
using Microsoft.Win32;
using System.Drawing;
using System.Net;
using System.Threading;

namespace SebiDscBridgeInstaller
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallerForm());
        }
    }

    public class InstallerForm : Form
    {
        private ProgressBar progressBar;
        private Label lblStatus;
        private Button btnAction;
        private Label lblTitle;
        private Label lblSub;

        public InstallerForm()
        {
            this.Text = "SEBI Hardware DSC Bridge - 1-Click Setup";
            this.Size = new Size(500, 240);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.BackColor = Color.White;

            lblTitle = new Label()
            {
                Text = "SEBI Hardware DSC Bridge Setup",
                Font = new Font("Segoe UI", 12, FontStyle.Bold),
                Location = new Point(20, 18),
                Size = new Size(440, 25),
                ForeColor = Color.FromArgb(15, 23, 42)
            };

            lblSub = new Label()
            {
                Text = "Setting up local bridge for USB Token signing on port 1620...",
                Font = new Font("Segoe UI", 9, FontStyle.Regular),
                Location = new Point(22, 45),
                Size = new Size(440, 20),
                ForeColor = Color.FromArgb(100, 116, 139)
            };

            progressBar = new ProgressBar()
            {
                Location = new Point(22, 85),
                Size = new Size(440, 22),
                Style = ProgressBarStyle.Marquee,
                MarqueeAnimationSpeed = 30
            };

            lblStatus = new Label()
            {
                Text = "Preparing installation...",
                Font = new Font("Segoe UI", 9, FontStyle.Italic),
                Location = new Point(22, 118),
                Size = new Size(440, 20),
                ForeColor = Color.FromArgb(51, 65, 85)
            };

            btnAction = new Button()
            {
                Text = "Installing...",
                Location = new Point(342, 150),
                Size = new Size(120, 32),
                Font = new Font("Segoe UI", 9, FontStyle.Bold),
                Enabled = false,
                BackColor = Color.FromArgb(16, 185, 129),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat
            };
            btnAction.FlatAppearance.BorderSize = 0;
            btnAction.Click += (s, e) => this.Close();

            this.Controls.Add(lblTitle);
            this.Controls.Add(lblSub);
            this.Controls.Add(progressBar);
            this.Controls.Add(lblStatus);
            this.Controls.Add(btnAction);

            this.Shown += (s, e) =>
            {
                ThreadPool.QueueUserWorkItem(DoInstall);
            };
        }

        private void UpdateStatus(string text, int progress)
        {
            if (this.InvokeRequired)
            {
                this.Invoke(new Action(() => UpdateStatus(text, progress)));
                return;
            }
            lblStatus.Text = text;
            if (progress >= 0)
            {
                progressBar.Style = ProgressBarStyle.Continuous;
                progressBar.Value = Math.Min(100, progress);
            }
        }

        private void DoInstall(object state)
        {
            try
            {
                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string targetDir = Path.Combine(localAppData, "SEBI-DSC-Bridge");
                Directory.CreateDirectory(targetDir);

                UpdateStatus("Extracting bridge service components...", 20);

                // 1. Extract embedded zip
                Assembly asm = Assembly.GetExecutingAssembly();
                string resourceName = null;
                foreach (string name in asm.GetManifestResourceNames())
                {
                    if (name.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
                    {
                        resourceName = name;
                        break;
                    }
                }

                if (resourceName != null)
                {
                    string tempZip = Path.Combine(Path.GetTempPath(), "sebi_dsc_bridge_setup.zip");
                    using (Stream resStream = asm.GetManifestResourceStream(resourceName))
                    using (FileStream fs = new FileStream(tempZip, FileMode.Create, FileAccess.Write))
                    {
                        resStream.CopyTo(fs);
                    }

                    // Extract to targetDir (overwrite files)
                    using (ZipArchive archive = ZipFile.OpenRead(tempZip))
                    {
                        foreach (ZipArchiveEntry entry in archive.Entries)
                        {
                            string destinationPath = Path.GetFullPath(Path.Combine(targetDir, entry.FullName));
                            if (destinationPath.StartsWith(targetDir, StringComparison.OrdinalIgnoreCase))
                            {
                                if (string.IsNullOrEmpty(entry.Name))
                                {
                                    Directory.CreateDirectory(destinationPath);
                                }
                                else
                                {
                                    Directory.CreateDirectory(Path.GetDirectoryName(destinationPath));
                                    try
                                    {
                                        entry.ExtractToFile(destinationPath, true);
                                    }
                                    catch {}
                                }
                            }
                        }
                    }
                    try { File.Delete(tempZip); } catch {}
                }

                UpdateStatus("Configuring Windows 1-Click Launch (sebidsc://)...", 50);

                string vbsTarget = Path.Combine(targetDir, "run-silent.vbs");

                // 2. Register sebidsc:// protocol
                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\Classes\sebidsc"))
                {
                    key.SetValue("", "URL:SEBI Hardware DSC Bridge");
                    key.SetValue("URL Protocol", "");
                    using (RegistryKey cmdKey = key.CreateSubKey(@"shell\open\command"))
                    {
                        cmdKey.SetValue("", string.Format("wscript.exe \"{0}\" \"%1\"", vbsTarget));
                    }
                }

                UpdateStatus("Configuring Windows Auto-Start...", 70);

                // 3. Add to Windows Startup shortcut
                string startupFolder = Environment.GetFolderPath(Environment.SpecialFolder.Startup);
                string shortcutPath = Path.Combine(startupFolder, "SEBI-DSC-Bridge.lnk");
                try
                {
                    string vbsMakeShortcut = string.Format(
                        "Set ws = CreateObject(\"WScript.Shell\")\r\n" +
                        "Set sc = ws.CreateShortcut(\"{0}\")\r\n" +
                        "sc.TargetPath = \"wscript.exe\"\r\n" +
                        "sc.Arguments = \"\"\"{1}\"\"\"\r\n" +
                        "sc.WorkingDirectory = \"{2}\"\r\n" +
                        "sc.Description = \"SEBI Hardware DSC Bridge\"\r\n" +
                        "sc.Save\r\n",
                        shortcutPath.Replace("\\", "\\\\"),
                        vbsTarget.Replace("\\", "\\\\"),
                        targetDir.Replace("\\", "\\\\")
                    );
                    string tempVbs = Path.Combine(Path.GetTempPath(), "make_sc.vbs");
                    File.WriteAllText(tempVbs, vbsMakeShortcut);
                    Process scProc = Process.Start("cscript", string.Format("//nologo \"{0}\"", tempVbs));
                    if (scProc != null) scProc.WaitForExit(3000);
                    try { File.Delete(tempVbs); } catch {}
                }
                catch {}

                // Also add Registry Run key for double insurance
                try
                {
                    using (RegistryKey runKey = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run"))
                    {
                        runKey.SetValue("SEBI_DSC_Bridge", string.Format("wscript.exe \"{0}\"", vbsTarget));
                    }
                }
                catch {}

                UpdateStatus("Checking Node.js runtime...", 85);

                // 4. Check if Node is present
                bool hasNode = false;
                try
                {
                    Process p = new Process();
                    p.StartInfo.FileName = "where";
                    p.StartInfo.Arguments = "node";
                    p.StartInfo.UseShellExecute = false;
                    p.StartInfo.CreateNoWindow = true;
                    p.Start();
                    p.WaitForExit(3000);
                    hasNode = (p.ExitCode == 0);
                }
                catch {}

                if (!hasNode)
                {
                    string localNode = Path.Combine(targetDir, "node.exe");
                    string progNode = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe");
                    if (File.Exists(localNode) || File.Exists(progNode))
                    {
                        hasNode = true;
                    }
                }

                if (!hasNode)
                {
                    // Try winget install OpenJS.NodeJS.LTS
                    UpdateStatus("Installing Node.js LTS via winget...", 90);
                    try
                    {
                        Process p = Process.Start("winget", "install OpenJS.NodeJS.LTS -e --silent --accept-source-agreements --accept-package-agreements");
                        if (p != null) p.WaitForExit(30000);
                    }
                    catch {}
                }

                UpdateStatus("Starting Hardware DSC Bridge on port 1620...", 95);

                // 5. Start the bridge right now
                try
                {
                    Process.Start("wscript.exe", string.Format("\"{0}\"", vbsTarget));
                }
                catch {}

                Thread.Sleep(1000);

                // Done!
                if (this.InvokeRequired)
                {
                    this.Invoke(new Action(() =>
                    {
                        UpdateStatus("✅ Setup Complete! Port 1620 is running.", 100);
                        lblTitle.Text = "✅ Setup Successful!";
                        lblTitle.ForeColor = Color.FromArgb(16, 185, 129);
                        lblSub.Text = "Hardware DSC Bridge is running. Return to your browser and sign.";
                        btnAction.Text = "Finish";
                        btnAction.Enabled = true;
                    }));
                }
            }
            catch (Exception ex)
            {
                if (this.InvokeRequired)
                {
                    this.Invoke(new Action(() =>
                    {
                        UpdateStatus("Error: " + ex.Message, 100);
                        MessageBox.Show("Setup error: " + ex.Message, "SEBI DSC Setup", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                        btnAction.Text = "Close";
                        btnAction.Enabled = true;
                    }));
                }
            }
        }
    }
}
