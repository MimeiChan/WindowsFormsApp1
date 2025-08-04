using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace WindowsFormsApp1
{
    public partial class Form1 : Form
    {
        // 追加：データ転送用 POCO
        public class RowData
        {
            public string product { get; set; } = "";
            public int? qty { get; set; }
            public int? price { get; set; }
            public bool isHeader { get; set; }
        }
            private readonly WebView2 _webView = new WebView2 { Dock = DockStyle.Fill };

            public Form1()
            {
                Text = "AG-Grid in WinForms (.NET Framework)";
                Width = 900;
                Height = 600;
                Controls.Add(_webView);
                Load += MainForm_Load;
            }

            private async void MainForm_Load(object sender, EventArgs e)
            {
                try
                {
                    await _webView.EnsureCoreWebView2Async(null);
                    _webView.CoreWebView2.WebMessageReceived += WebMessageReceived;
                    _webView.CoreWebView2.NavigationCompleted += NavigationCompleted;
                    _webView.CoreWebView2.DOMContentLoaded += DOMContentLoaded;

                    // HTML 読み込み
                    var htmlPath = Path.Combine(Application.StartupPath, "aggrid.html");
                    MessageBox.Show($"HTMLパス: {htmlPath}\nファイル存在: {File.Exists(htmlPath)}", "デバッグ情報");
                    _webView.Source = new Uri(htmlPath);
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"初期化エラー: {ex.Message}", "エラー");
                }
            }

            private void NavigationCompleted(object sender, CoreWebView2NavigationCompletedEventArgs e)
            {
                MessageBox.Show($"ナビゲーション完了\n成功: {e.IsSuccess}\nWebErrorStatus: {e.WebErrorStatus}", "ナビゲーション");
            }

            private void DOMContentLoaded(object sender, CoreWebView2DOMContentLoadedEventArgs e)
            {
                MessageBox.Show("DOM読み込み完了", "DOM");

                // ---- 初期データ（すべて RowData 型）----
                var rows = new[]
                {
                    new RowData { product = "=== フルーツ ===", qty = null, price = null, isHeader = true },
                    new RowData { product = "りんご",             qty = 10,  price = 120,  isHeader = false },
                    new RowData { product = "みかん",             qty =  8,  price =  90,  isHeader = false }
                };

                // JSON 化して Web 側へ
                var json = JsonConvert.SerializeObject(new { type = "setData", payload = rows });
                _webView.CoreWebView2.PostWebMessageAsJson(json);
            }

            private void WebMessageReceived(object sender, CoreWebView2WebMessageReceivedEventArgs e)
            {
                dynamic msg = JsonConvert.DeserializeObject(e.WebMessageAsJson);
                if (msg?.type == "dataChanged")
                {
                    // ここで DB 保存など
                    //MessageBox.Show("編集結果を受信しました", "Host");
                }
                else if (msg?.type == "jsError")
                {
                    MessageBox.Show($"JavaScript エラー:\n{msg?.message}", "JavaScript エラー");
                }
            }
        }
    }
