filepath = '/tmp/theunitedhell-clone/src/routes/__root.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# Remove Ezoic scripts from head (they cause hydration mismatch by modifying DOM before React hydrates)
old_scripts = '''      // Ezoic Site Integration - Step 2
      {
        src: "https://www.ezojs.com/ezoic/sa.min.js",
        async: true,
      },
      {
        children: `window.ezstandalone=window.ezstandalone||{cmd:[]};window.ezstandalone.cmd.push(function(){if(window.ezstandalone)window.ezstandalone.showAds();});`,
      },
      {'''

new_scripts = '''      {'''

content = content.replace(old_scripts, new_scripts)

# Add Ezoic script loading AFTER hydration via a component
# Find the RootComponent function and add EzoicScriptLoader
old_root_start = '''function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>'''

new_root_start = '''function EzoicScriptLoader() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Load Ezoic sa.min.js after hydration to avoid DOM modification conflicts
    window.ezstandalone = window.ezstandalone || { cmd: [] };
    const script = document.createElement("script");
    script.src = "https://www.ezojs.com/ezoic/sa.min.js";
    script.async = true;
    script.onload = () => {
      window.ezstandalone?.cmd.push(function () {
        if (window.ezstandalone) window.ezstandalone.showAds();
      });
    };
    document.head.appendChild(script);
  }, []);
  return null;
}

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <EzoicScriptLoader />'''

content = content.replace(old_root_start, new_root_start)

with open(filepath, 'w') as f:
    f.write(content)

print("Ezoic scripts moved from head to post-hydration loader")
