import os

# ============================================================
# Fix 1: __root.tsx - Remove EzoicAdHeader/Footer wrapper divs
# that create gaps between header and content.
# Move them inside the layout but with zero height when no ad loads.
# ============================================================
filepath = '/tmp/tc/src/routes/__root.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# Remove the EzoicAdHeader wrapper div (creates gap at top)
content = content.replace(
    '''        <SiteHeader />
        <div className="container-edit">
          <EzoicAdHeader />
        </div>
        <main className="flex-1">''',
    '''        <SiteHeader />
        <main className="flex-1">'''
)

# Remove the EzoicAdFooter wrapper div (creates gap at bottom)
content = content.replace(
    '''        </main>
        <div className="container-edit">
          <EzoicAdFooter />
        </div>
        <SiteFooter />''',
    '''        </main>
        <SiteFooter />'''
)

with open(filepath, 'w') as f:
    f.write(content)
print("Fixed __root.tsx: removed EzoicAdHeader/Footer wrapper divs (restored original layout)")

# ============================================================
# Fix 2: index.tsx - Remove Ezoic ads from inside the grid.
# The grid should be a simple map of ArticleCards like the original.
# The Ezoic ads are still loaded via EzoicScriptLoader in __root.tsx
# and can be placed elsewhere without breaking the grid.
# ============================================================
filepath = '/tmp/tc/src/routes/index.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# Remove EzoicAd import
content = content.replace(
    'import { EzoicAdInArticle, EzoicAdBetweenArticles } from "@/components/ads/EzoicAd";\n',
    ''
)

# Remove Fragment import (no longer needed)
content = content.replace(
    'import { useEffect, useState, Fragment } from "react";',
    'import { useEffect, useState } from "react";'
)

# Replace the grid with the original simple grid (no Ezoic ads inside)
old_grid = '''      <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
        {q.data?.map((article, i) => (
          <Fragment key={article.id}>
            <ArticleCard article={article} variant="default" />
            {i === 2 && (
              <div className="col-span-full sm:col-span-2 lg:col-span-3 flex justify-center">
                <EzoicAdInArticle />
              </div>
            )}
            {i === 5 && (
              <div className="col-span-full sm:col-span-2 lg:col-span-3 flex justify-center">
                <EzoicAdBetweenArticles />
              </div>
            )}
          </Fragment>
        ))}
      </div>'''

new_grid = '''      <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
        {q.data?.map((article) => (
          <ArticleCard key={article.id} article={article} variant="default" />
        ))}
      </div>'''

content = content.replace(old_grid, new_grid)

with open(filepath, 'w') as f:
    f.write(content)
print("Fixed index.tsx: restored original simple grid (removed Ezoic ads that broke layout)")

# ============================================================
# Fix 3: __root.tsx - Remove unused EzoicAdHeader/Footer imports
# since we removed them from the layout
# ============================================================
filepath = '/tmp/tc/src/routes/__root.tsx'
with open(filepath, 'r') as f:
    content = f.read()

content = content.replace(
    'import { EzoicAdHeader, EzoicAdFooter } from "@/components/ads/EzoicAd";\n',
    ''
)

with open(filepath, 'w') as f:
    f.write(content)
print("Fixed __root.tsx: removed unused EzoicAdHeader/Footer imports")
