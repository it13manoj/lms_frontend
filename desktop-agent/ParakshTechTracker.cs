using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

[assembly: AssemblyTitle("ParakshTech LMS Tracker")]
[assembly: AssemblyDescription("ParakshTech LMS Office Hours Screenshot Tracker")]
[assembly: AssemblyCompany("ParakshTech")]
[assembly: AssemblyProduct("ParakshTech LMS Tracker")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

namespace ParakshTechTracker
{
    static class Program
    {
        private const int PORT = 47891;
        private const int CAPTURE_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
        private const int MAX_WIDTH = 1280;
        private const long JPEG_QUALITY = 68L;

        private static readonly string AppDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "ParakshTechTracker"
        );
        private static readonly string InstalledExePath = Path.Combine(AppDir, "ParakshTechTracker.exe");
        private static readonly string SessionFilePath = Path.Combine(AppDir, "session.json");

        private static readonly object StateLock = new object();
        private static string _token = "";
        private static string _apiUrl = "https://lms.parakshtech.com/api";
        private static string _userEmail = "";
        private static bool _isTracking = false;
        private static DateTime _lastCaptureUtc = DateTime.MinValue;
        private static string _lastStatus = "Waiting for LMS login";

        private static System.Threading.Timer _captureTimer;
        private static NotifyIcon _trayIcon;
        private static Mutex _singleInstanceMutex;

        [STAThread]
        static void Main(string[] args)
        {
            ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12 | (SecurityProtocolType)3072;

            bool createdNew;
            _singleInstanceMutex = new Mutex(true, "Global\\ParakshTechTracker_SingleInstance_47891", out createdNew);
            if (!createdNew)
            {
                // Already running in background
                return;
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            Directory.CreateDirectory(AppDir);
            EnsureInstalledAndStartup();
            LoadSession();

            SetupTrayIcon();
            StartLocalHttpServer();
            StartCaptureLoop();

            Application.Run();
        }

        private static void EnsureInstalledAndStartup()
        {
            try
            {
                string currentExe = Assembly.GetExecutingAssembly().Location;
                if (!string.Equals(Path.GetFullPath(currentExe), Path.GetFullPath(InstalledExePath), StringComparison.OrdinalIgnoreCase))
                {
                    File.Copy(currentExe, InstalledExePath, true);
                }

                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true))
                {
                    if (key != null)
                    {
                        key.SetValue("ParakshTechTracker", "\"" + InstalledExePath + "\"");
                    }
                }
            }
            catch
            {
                // Non-fatal if locked or restricted
            }
        }

        private static void SetupTrayIcon()
        {
            ContextMenuStrip menu = new ContextMenuStrip();
            ToolStripMenuItem statusItem = new ToolStripMenuItem("ParakshTech LMS Tracker (Running)") { Enabled = false };
            ToolStripMenuItem openLmsItem = new ToolStripMenuItem("Open LMS Portal", null, (s, e) =>
            {
                try { Process.Start("https://lms.parakshtech.com"); } catch { }
            });
            ToolStripMenuItem exitItem = new ToolStripMenuItem("Exit Tracker", null, (s, e) =>
            {
                if (_trayIcon != null) _trayIcon.Visible = false;
                if (_captureTimer != null) _captureTimer.Dispose();
                Application.Exit();
            });

            menu.Items.Add(statusItem);
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add(openLmsItem);
            menu.Items.Add(exitItem);

            _trayIcon = new NotifyIcon
            {
                Icon = SystemIcons.Application,
                Text = "ParakshTech LMS Screenshot Tracker",
                ContextMenuStrip = menu,
                Visible = true
            };
        }

        private static void LoadSession()
        {
            try
            {
                if (!File.Exists(SessionFilePath)) return;
                string json = File.ReadAllText(SessionFilePath, Encoding.UTF8);
                lock (StateLock)
                {
                    _token = ExtractJsonString(json, "token");
                    string api = ExtractJsonString(json, "apiUrl");
                    if (!string.IsNullOrEmpty(api)) _apiUrl = api;
                    _userEmail = ExtractJsonString(json, "email");
                    _isTracking = ExtractJsonBool(json, "active") && !string.IsNullOrEmpty(_token);
                    _lastStatus = _isTracking ? "Active (Office Hours 09:30 AM - 06:30 PM IST)" : "Stopped (Logged out)";
                }
            }
            catch { }
        }

        private static void SaveSession()
        {
            try
            {
                string json;
                lock (StateLock)
                {
                    json = "{"
                        + "\"token\":\"" + EscapeJson(_token) + "\","
                        + "\"apiUrl\":\"" + EscapeJson(_apiUrl) + "\","
                        + "\"email\":\"" + EscapeJson(_userEmail) + "\","
                        + "\"active\":" + (_isTracking ? "true" : "false")
                        + "}";
                }
                File.WriteAllText(SessionFilePath, json, Encoding.UTF8);
            }
            catch { }
        }

        private static void StartLocalHttpServer()
        {
            Thread serverThread = new Thread(() =>
            {
                try
                {
                    TcpListener listener = new TcpListener(IPAddress.Loopback, PORT);
                    listener.Start();
                    while (true)
                    {
                        TcpClient client = listener.AcceptTcpClient();
                        ThreadPool.QueueUserWorkItem(_ => HandleClient(client));
                    }
                }
                catch { }
            });
            serverThread.IsBackground = true;
            serverThread.Start();
        }

        private static void HandleClient(TcpClient client)
        {
            try
            {
                using (client)
                using (NetworkStream stream = client.GetStream())
                {
                    stream.ReadTimeout = 5000;
                    byte[] buffer = new byte[16384];
                    int bytesRead = stream.Read(buffer, 0, buffer.Length);
                    if (bytesRead <= 0) return;

                    string request = Encoding.UTF8.GetString(buffer, 0, bytesRead);
                    int headerEnd = request.IndexOf("\r\n\r\n", StringComparison.Ordinal);
                    string headerPart = headerEnd >= 0 ? request.Substring(0, headerEnd) : request;
                    string body = headerEnd >= 0 ? request.Substring(headerEnd + 4) : "";

                    // Read remaining body if Content-Length specifies more bytes
                    int contentLength = 0;
                    Match clMatch = Regex.Match(headerPart, @"Content-Length:\s*(\d+)", RegexOptions.IgnoreCase);
                    if (clMatch.Success)
                    {
                        int.TryParse(clMatch.Groups[1].Value, out contentLength);
                        while (Encoding.UTF8.GetByteCount(body) < contentLength)
                        {
                            int extra = stream.Read(buffer, 0, buffer.Length);
                            if (extra <= 0) break;
                            body += Encoding.UTF8.GetString(buffer, 0, extra);
                        }
                    }

                    string[] lines = headerPart.Split(new[] { "\r\n" }, StringSplitOptions.None);
                    string[] reqLine = lines.Length > 0 ? lines[0].Split(' ') : new[] { "GET", "/" };
                    string method = reqLine.Length > 0 ? reqLine[0].ToUpperInvariant() : "GET";
                    string path = reqLine.Length > 1 ? reqLine[1].Split('?')[0].ToLowerInvariant() : "/";

                    if (method == "OPTIONS")
                    {
                        WriteHttpResponse(stream, 204, "");
                        return;
                    }

                    if (method == "GET" && path == "/status")
                    {
                        string resp;
                        lock (StateLock)
                        {
                            resp = "{"
                                + "\"installed\":true,"
                                + "\"running\":true,"
                                + "\"tracking\":" + (_isTracking ? "true" : "false") + ","
                                + "\"email\":\"" + EscapeJson(_userEmail) + "\","
                                + "\"lastStatus\":\"" + EscapeJson(_lastStatus) + "\","
                                + "\"version\":\"1.0.0\""
                                + "}";
                        }
                        WriteHttpResponse(stream, 200, resp);
                        return;
                    }

                    if (method == "POST" && path == "/start")
                    {
                        string token = ExtractJsonString(body, "token");
                        string apiUrl = ExtractJsonString(body, "apiUrl");
                        string email = ExtractJsonString(body, "email");

                        if (string.IsNullOrEmpty(token))
                        {
                            WriteHttpResponse(stream, 400, "{\"success\":false,\"message\":\"Missing token\"}");
                            return;
                        }

                        bool shouldCaptureNow = false;
                        lock (StateLock)
                        {
                            bool wasTracking = _isTracking;
                            _token = token;
                            if (!string.IsNullOrEmpty(apiUrl)) _apiUrl = apiUrl.TrimEnd('/');
                            if (!string.IsNullOrEmpty(email)) _userEmail = email;
                            _isTracking = true;
                            _lastStatus = "Active (Auto capture every 10 mins)";
                            if (!wasTracking || (DateTime.UtcNow - _lastCaptureUtc).TotalMinutes >= 10)
                            {
                                shouldCaptureNow = true;
                            }
                        }

                        SaveSession();
                        if (_trayIcon != null)
                        {
                            _trayIcon.Text = "ParakshTech Tracker: Active";
                        }

                        if (shouldCaptureNow)
                        {
                            ThreadPool.QueueUserWorkItem(_ => TryCaptureAndUpload("Desktop Agent started (Office Hours)"));
                        }

                        WriteHttpResponse(stream, 200, "{\"success\":true,\"tracking\":true}");
                        return;
                    }

                    if (method == "POST" && path == "/stop")
                    {
                        lock (StateLock)
                        {
                            _isTracking = false;
                            _token = "";
                            _lastCaptureUtc = DateTime.MinValue;
                            _lastStatus = "Stopped (Logged out)";
                        }
                        SaveSession();
                        if (_trayIcon != null)
                        {
                            _trayIcon.Text = "ParakshTech Tracker: Stopped";
                        }
                        WriteHttpResponse(stream, 200, "{\"success\":true,\"tracking\":false}");
                        return;
                    }

                    WriteHttpResponse(stream, 404, "{\"success\":false,\"message\":\"Not found\"}");
                }
            }
            catch { }
        }

        private static void WriteHttpResponse(NetworkStream stream, int statusCode, string jsonBody)
        {
            string statusText = statusCode == 200 ? "OK" : (statusCode == 204 ? "No Content" : (statusCode == 400 ? "Bad Request" : "Not Found"));
            byte[] bodyBytes = Encoding.UTF8.GetBytes(jsonBody ?? "");
            string headers = "HTTP/1.1 " + statusCode + " " + statusText + "\r\n"
                + "Access-Control-Allow-Origin: *\r\n"
                + "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
                + "Access-Control-Allow-Headers: Content-Type, Authorization\r\n"
                + "Access-Control-Allow-Private-Network: true\r\n"
                + "Content-Type: application/json; charset=utf-8\r\n"
                + "Content-Length: " + bodyBytes.Length + "\r\n"
                + "Connection: close\r\n\r\n";
            byte[] headerBytes = Encoding.ASCII.GetBytes(headers);
            stream.Write(headerBytes, 0, headerBytes.Length);
            if (bodyBytes.Length > 0)
            {
                stream.Write(bodyBytes, 0, bodyBytes.Length);
            }
        }

        private static void StartCaptureLoop()
        {
            _captureTimer = new System.Threading.Timer(_ =>
            {
                bool active;
                DateTime lastCap;
                lock (StateLock)
                {
                    active = _isTracking && !string.IsNullOrEmpty(_token);
                    lastCap = _lastCaptureUtc;
                }

                if (!active) return;
                if (!IsWithinOfficeHoursIST()) return;

                if (lastCap == DateTime.MinValue || (DateTime.UtcNow - lastCap).TotalMilliseconds >= CAPTURE_INTERVAL_MS)
                {
                    TryCaptureAndUpload("Desktop Agent Auto Capture (Every 10 mins)");
                }
            }, null, 15000, 15000);
        }

        private static bool IsWithinOfficeHoursIST()
        {
            DateTime istNow = DateTime.UtcNow.AddMinutes(330);
            int totalMinutes = istNow.Hour * 60 + istNow.Minute;
            return totalMinutes >= (9 * 60 + 30) && totalMinutes <= (18 * 60 + 30);
        }

        private static void TryCaptureAndUpload(string notes)
        {
            if (!IsWithinOfficeHoursIST())
            {
                lock (StateLock) { _lastStatus = "Paused (Outside 09:30 AM - 06:30 PM IST)"; }
                return;
            }

            string token;
            string apiUrl;
            lock (StateLock)
            {
                if (!_isTracking || string.IsNullOrEmpty(_token)) return;
                token = _token;
                apiUrl = _apiUrl;
            }

            try
            {
                string dataUrl = CaptureDesktopAsJpegDataUrl();
                if (string.IsNullOrEmpty(dataUrl)) return;

                string payload = "{\"image\":\"" + dataUrl + "\",\"notes\":\"" + EscapeJson(notes) + "\"}";
                byte[] bytes = Encoding.UTF8.GetBytes(payload);

                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(apiUrl.TrimEnd('/') + "/screenshots/upload");
                req.Method = "POST";
                req.ContentType = "application/json";
                req.Headers["Authorization"] = "Bearer " + token;
                req.Timeout = 20000;
                req.ContentLength = bytes.Length;

                using (Stream reqStream = req.GetRequestStream())
                {
                    reqStream.Write(bytes, 0, bytes.Length);
                }

                using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                {
                    if ((int)resp.StatusCode >= 200 && (int)resp.StatusCode < 300)
                    {
                        lock (StateLock)
                        {
                            _lastCaptureUtc = DateTime.UtcNow;
                            _lastStatus = "Last uploaded at " + DateTime.UtcNow.AddMinutes(330).ToString("hh:mm tt") + " IST";
                        }
                    }
                }
            }
            catch (WebException wex)
            {
                HttpWebResponse errResp = wex.Response as HttpWebResponse;
                if (errResp != null && errResp.StatusCode == HttpStatusCode.Unauthorized)
                {
                    lock (StateLock)
                    {
                        _isTracking = false;
                        _token = "";
                        _lastStatus = "Session expired - waiting for LMS login";
                    }
                    SaveSession();
                }
            }
            catch
            {
                // Will retry on next tick
            }
        }

        private static string CaptureDesktopAsJpegDataUrl()
        {
            Rectangle bounds = SystemInformation.VirtualScreen;
            if (bounds.Width <= 0 || bounds.Height <= 0)
            {
                bounds = Screen.PrimaryScreen.Bounds;
            }

            using (Bitmap raw = new Bitmap(bounds.Width, bounds.Height, PixelFormat.Format24bppRgb))
            {
                using (Graphics g = Graphics.FromImage(raw))
                {
                    g.CopyFromScreen(bounds.Left, bounds.Top, 0, 0, bounds.Size, CopyPixelOperation.SourceCopy);
                }

                int targetW = raw.Width > MAX_WIDTH ? MAX_WIDTH : raw.Width;
                int targetH = raw.Width > MAX_WIDTH
                    ? Math.Max(1, (int)Math.Round(raw.Height * ((double)MAX_WIDTH / raw.Width)))
                    : raw.Height;

                using (Bitmap resized = new Bitmap(targetW, targetH))
                {
                    using (Graphics g2 = Graphics.FromImage(resized))
                    {
                        g2.InterpolationMode = InterpolationMode.HighQualityBicubic;
                        g2.DrawImage(raw, 0, 0, targetW, targetH);
                    }

                    ImageCodecInfo jpgEncoder = GetEncoder(ImageFormat.Jpeg);
                    using (MemoryStream ms = new MemoryStream())
                    {
                        if (jpgEncoder != null)
                        {
                            EncoderParameters encParams = new EncoderParameters(1);
                            encParams.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, JPEG_QUALITY);
                            resized.Save(ms, jpgEncoder, encParams);
                        }
                        else
                        {
                            resized.Save(ms, ImageFormat.Jpeg);
                        }
                        return "data:image/jpeg;base64," + Convert.ToBase64String(ms.ToArray());
                    }
                }
            }
        }

        private static ImageCodecInfo GetEncoder(ImageFormat format)
        {
            foreach (ImageCodecInfo codec in ImageCodecInfo.GetImageDecoders())
            {
                if (codec.FormatID == format.Guid) return codec;
            }
            return null;
        }

        private static string ExtractJsonString(string json, string key)
        {
            if (string.IsNullOrEmpty(json)) return "";
            Match m = Regex.Match(json, "\"" + Regex.Escape(key) + "\"\\s*:\\s*\"((?:\\\\.|[^\"\\\\])*)\"");
            if (!m.Success) return "";
            return m.Groups[1].Value.Replace("\\\"", "\"").Replace("\\\\", "\\").Replace("\\/", "/");
        }

        private static bool ExtractJsonBool(string json, string key)
        {
            if (string.IsNullOrEmpty(json)) return false;
            Match m = Regex.Match(json, "\"" + Regex.Escape(key) + "\"\\s*:\\s*(true|false)", RegexOptions.IgnoreCase);
            return m.Success && string.Equals(m.Groups[1].Value, "true", StringComparison.OrdinalIgnoreCase);
        }

        private static string EscapeJson(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            return s.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "").Replace("\n", "");
        }
    }
}

