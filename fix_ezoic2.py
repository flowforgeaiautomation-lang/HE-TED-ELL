filepath = '/tmp/theunitedhell-clone/src/routes/__root.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# Add EzoicScriptLoader component before RootComponent
old = '''function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {'''

new = '''function EzoicScriptLoader() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as any).ezstandalone = (window as any).ezstandalone || { cmd: [] };
    const script = document.createElement("script");
    script.src = "https://www.ezojs.com/ezoic/sa.min.js";
    script.async = true;
    script.onload = () => {
      (window as any).ezstandalone?.cmd.push(function () {
        if ((window as any).ezstandalone) (window as any).ezstandalone.showAds();
      });
    };
    document.head.appendChild(script);
  }, []);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {'''

content = content.replace(old, new)

# Add EzoicScriptLoader inside the QueryClientProvider
old_render = '''  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col bg-background text-foreground">'''

new_render = '''  return (
    <QueryClientProvider client={queryClient}>
      <EzoicScriptLoader />
      <div className="min-h-screen flex flex-col bg-background text-foreground">'''

content = content.replace(old_render, new_render)

with open(filepath, 'w') as f:
    f.write(content)

print("EzoicScriptLoader added")
