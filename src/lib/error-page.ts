export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>The United Hell</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      *,*::before,*::after{box-sizing:border-box}
      body{font-family:"Fraunces",Georgia,"Times New Roman",serif;background:#0b0b0b;color:#f5f5f5;display:grid;place-items:center;min-height:100vh;margin:0;padding:1.5rem}
      .card{max-width:32rem;width:100%;text-align:center;padding:2.5rem 2rem}
      .masthead{font-size:1.5rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin:0 0 .25rem}
      .tag{font-family:system-ui,-apple-system,sans-serif;font-size:.7rem;letter-spacing:.2em;text-transform:uppercase;color:#888;margin:0 0 2rem}
      h1{font-size:1.25rem;font-weight:600;margin:0 0 .75rem}
      p{font-family:system-ui,-apple-system,sans-serif;color:#a0a0a0;line-height:1.5;margin:0 0 2rem}
      .actions{display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap}
      a,button{padding:.6rem 1.25rem;border-radius:2px;font-family:system-ui,-apple-system,sans-serif;font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.12em;cursor:pointer;text-decoration:none;border:1px solid transparent;transition:opacity .2s}
      .primary{background:#f5f5f5;color:#0b0b0b}
      .primary:hover{opacity:.85}
      .secondary{background:transparent;color:#f5f5f5;border-color:#444}
      .secondary:hover{border-color:#f5f5f5}
      .auto{font-family:system-ui,-apple-system,sans-serif;font-size:.7rem;color:#666;margin-top:1.5rem}
    </style>
  </head>
  <body>
    <div class="card">
      <div class="masthead">The United Hell</div>
      <div class="tag">Beyond comfort. Beyond headlines.</div>
      <h1>We'll be right back</h1>
      <p>A temporary issue interrupted this page. Your stories are safe and will reappear in a moment.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Reload page</button>
        <a class="secondary" href="/">Go to front page</a>
      </div>
      <p class="auto">Reloading automatically in 10 seconds&hellip;</p>
    </div>
    <script>setTimeout(function(){try{location.reload();}catch(e){}},10000);</script>
  </body>
</html>`;
}
