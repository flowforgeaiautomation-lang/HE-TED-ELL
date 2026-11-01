import { useEffect, useState } from "react";
import { ClientOnly } from "@/components/treehedron/ClientOnly";
import { TreehedronNav } from "@/components/treehedron/TreehedronNav";
import { TreehedronFooter } from "@/components/treehedron/TreehedronFooter";

export function TreehedronLayout({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <div className="th-page">
      {isClient && <TreehedronNav />}
      <main className="th-main">{children}</main>
      <TreehedronFooter />
    </div>
  );
}

export { ClientOnly };
