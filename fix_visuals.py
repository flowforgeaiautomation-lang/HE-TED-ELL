import os

# Fix 1: Remove py-2 padding from EzoicAdHeader/Footer wrapper divs in __root.tsx
filepath = '/tmp/theunitedhell-clone/src/routes/__root.tsx'
with open(filepath, 'r') as f:
    content = f.read()

content = content.replace(
    '<div className="container-edit py-2">\n          <EzoicAdHeader />',
    '<div className="container-edit">\n          <EzoicAdHeader />'
)
content = content.replace(
    '<div className="container-edit py-2">\n          <EzoicAdFooter />',
    '<div className="container-edit">\n          <EzoicAdFooter />'
)

with open(filepath, 'w') as f:
    f.write(content)
print("Fixed __root.tsx: removed py-2 from ad wrapper divs")

# Fix 2: Remove py-4 padding from EzoicAdInArticle/BetweenArticles wrapper divs in index.tsx
filepath = '/tmp/theunitedhell-clone/src/routes/index.tsx'
with open(filepath, 'r') as f:
    content = f.read()

content = content.replace(
    '<div className="col-span-full sm:col-span-2 lg:col-span-3 flex justify-center py-4">\n                <EzoicAdInArticle />',
    '<div className="col-span-full sm:col-span-2 lg:col-span-3 flex justify-center">\n                <EzoicAdInArticle />'
)
content = content.replace(
    '<div className="col-span-full sm:col-span-2 lg:col-span-3 flex justify-center py-4">\n                <EzoicAdBetweenArticles />',
    '<div className="col-span-full sm:col-span-2 lg:col-span-3 flex justify-center">\n                <EzoicAdBetweenArticles />'
)

with open(filepath, 'w') as f:
    f.write(content)
print("Fixed index.tsx: removed py-4 from ad wrapper divs")
