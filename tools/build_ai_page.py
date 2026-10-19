import re, sys
icons_dir, out = sys.argv[1], sys.argv[2]
def path(n):
    return re.search(r' d="([^"]*)"', open(f'{icons_dir}/{n}.svg').read()).group(1)
def tile(n, label, cls):
    return (f'<span class="ai-tile ai-tile-{cls}" title="{label}">'
            f'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="{path(n)}"/></svg></span>')
# Figma's logo is five coloured shapes, so it's drawn in full colour
# rather than from the single-path mono icon.
FIGMA = ('<span class="ai-tile ai-tile-light" title="Figma">'
  '<svg viewBox="0 0 38 57" aria-hidden="true" style="width:auto">'
  '<path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0z" fill="#1ABCFE"/>'
  '<path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0z" fill="#0ACF83"/>'
  '<path d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19z" fill="#FF7262"/>'
  '<path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5z" fill="#F24E1E"/>'
  '<path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5z" fill="#A259FF"/>'
  '</svg></span>')
T = {'claude': tile('claude','Claude','claude'), 'figma': FIGMA,
     'vercel': tile('vercel','Vercel','dark'), 'github': tile('github','GitHub','dark'),
     'apple': tile('apple','App Store','dark'),
     'notion': tile('notion','Notion AI','light'),
     'chatgpt': tile('openai','ChatGPT','light'),
     'copilot': tile('githubcopilot','GitHub Copilot','dark'),
     # Nano Banana is Google's Gemini image model: Gemini spark in its gradient
     'gemini': ('<span class="ai-tile ai-tile-light" title="Nano Banana">'
                '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="gemgrad" x1="0" y1="1" x2="1" y2="0">'
                '<stop offset="0" stop-color="#1c7dff"/><stop offset="0.55" stop-color="#7a6cff"/><stop offset="1" stop-color="#e86aa6"/>'
                f'</linearGradient></defs><path fill="url(#gemgrad)" d="{path("googlegemini")}"/></svg></span>'),
     # no ComfyUI mark in the icon set: a play glyph for motion on a dark tile
     'comfy': ('<span class="ai-tile ai-tile-comfy" title="ComfyUI">'
               '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg></span>'),
     # Lovable isn't in the icon set: its gradient heart, drawn by hand
     'lovable': ('<span class="ai-tile ai-tile-dark" title="Lovable">'
                 '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="lovgrad" x1="0" y1="0" x2="1" y2="1">'
                 '<stop offset="0" stop-color="#ff8a3d"/><stop offset="0.5" stop-color="#ff3d7f"/><stop offset="1" stop-color="#5b6bff"/>'
                 '</linearGradient></defs><path fill="url(#lovgrad)" d="M12 21s-7.5-4.6-9.6-9.2C1 8.6 3 5 6.5 5c2 0 3.5 1.1 5.5 3 2-1.9 3.5-3 5.5-3C21 5 23 8.6 21.6 11.8 19.5 16.4 12 21 12 21z"/></svg></span>'),
     # Fathom (fathom.ai) mark redrawn from its app icon: two slanted
     # bars and a darker stem, drawn edge to edge on the black tile
     'fathom': ('<span class="ai-tile ai-tile-fathom" title="Fathom">'
                '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke-linecap="round" stroke-width="2.9">'
                '<path d="M7.4 6.9L17.2 11.8" stroke="#14c3ff"/>'
                '<path d="M7.4 11.3L12.6 13.9" stroke="#14c3ff"/>'
                '<path d="M7.4 15.4V17.1" stroke="#1584b0"/>'
                '</svg></span>')}
steps = [
 (['claude','chatgpt','notion','fathom'], 'Research &amp; Define',
  'Market, audience and competitor insights, plus the rules and data behind a product, uncovered in minutes instead of days of digging. User interviews are recorded and summarised automatically, so I can focus on the conversation.',
  'Claude or ChatGPT, Notion AI, Fathom'),
 (['lovable','figma','claude','chatgpt'], 'Ideate &amp; Prototype',
  'Explore concepts and alternative directions in minutes, then turn the best ones into working prototypes to validate ideas early.',
  'Lovable, Figma Make, Claude or ChatGPT'),
 (['claude','figma','gemini','comfy'], 'Design &amp; UX Copy',
  'Screens and UX copy with Claude Design and Figma\'s AI assistant, on a design system Claude reads directly through the Figma MCP. Imagery comes from Nano Banana, and motion is explored in ComfyUI.',
  'Claude Design, Figma MCP, Figma Assistant, Nano Banana, ComfyUI (motion)'),
 (['claude','copilot'], 'Build &amp; Ship',
  'Turn designs into working web apps and native iOS and Android apps, live on the web, the App Store and Google Play, without waiting for engineering.',
  'Claude Code, GitHub Copilot'),
 (['claude','chatgpt'], 'Measure &amp; Improve',
  'Summarise feedback and reviews, spot what to fix next, and ship improvements in days rather than sprints.',
  'Claude or ChatGPT'),
]
rows = '\n'.join(f'''      <div class="about-row">
        <h2>{h}</h2>
        <div class="about-row-body">
          <div class="ai-tiles">{''.join(T[i] for i in ic)}</div>
          <p class="ai-tools">{t}</p>
          <p>{d}</p>
        </div>
      </div>''' for ic,h,d,t in steps)

tools_built = [
 ('mortgage_radar', 'mortgage_offers.png?v=2', 'Mortgage calculator'),
 ('memeo', 'flashcards_thumb.png?v=1', 'Memeo'),
 ('escolas', 'schools_thumb.png?v=3', 'Escolas do Porto'),
]
cards = '\n'.join(f'''        <a class="tool-card" href="{slug}.html" onclick="folio('{slug}', 'content'); return false;">
          <span class="tool-card-thumb"><img src="projects/claude_code/assets/{img}" alt="" /></span>
          <span class="tool-card-label"><span>{label}</span></span>
        </a>''' for slug, img, label in tools_built)

html = f'''<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>ai</title>
<style>

/* Same page shell, title block and type scale as the Claude Code page,
   with the About page's heading-left / text-right rows for the workflow. */
#wrap_project {{
  margin-left: auto;
  margin-right: auto;
  width: 84%;
  max-width: 940px;
  opacity: 0;
  -webkit-transform: translate3d(0, 60px, 0);
          transform: translate3d(0, 60px, 0);
  -webkit-transition: all 0.85s ease-out;
          transition: all 0.85s ease-out;
  padding-bottom: 120px;
  font-family: 'Inter', sans-serif;
}}
.project-alt {{
  opacity: 1 !important;
  -webkit-transform: translate3d(0, 0, 0) !important;
          transform: translate3d(0, 0, 0) !important;
}}

/* Light-rails animation (WebGL, drawn by initRailsHero in angelo.js). Fades
   into the page at the bottom. */
.ai-hero {{
  position: relative;
  height: 100vh;
  height: 100svh;
  min-height: 560px;
  background: #fff;   /* the canvas fades into white in light mode, black in dark */
  -webkit-mask-image: linear-gradient(to bottom, #000 75%, transparent);
          mask-image: linear-gradient(to bottom, #000 75%, transparent);
}}
.ai-hero {{ overflow: hidden; }}
.ai-hero-canvas {{
  display: block;
  width: 100%;
  height: 100%;
}}
/* Sits behind the top of the page so the title keeps the About page's
   position (.page-title's 20% top padding) instead of starting below it. */
.ai-hero {{
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 0;
}}
.ai-hero + .page-title {{
  position: relative;
  z-index: 1;
}}

.page-title {{
  width: 84%;
  max-width: 940px;
  margin: 0 auto;
  text-align: left;
  padding: 0 0 60px;
  box-sizing: border-box;
}}
.page-title h4 {{
  font-family: 'Inter', sans-serif;
  color: #191919;
  font-size: clamp(2.2rem, 11vw, 4rem);
  text-align: left;   /* lines up with the text column below */
  font-style: normal;
  font-weight: 400;
  line-height: 100%;
  text-decoration: none;
  position: static;
  letter-spacing: normal;
  text-transform: none;
  margin: 20% 0 0;   /* same as the About title: 20% of the text column */
}}

.project-details {{
  max-width: 940px;
  margin: 0 auto 60px;
}}
.project-description {{
  font-size: 22px;
  line-height: 32px;
  margin-bottom: 15px;
  color: #191919;
}}
.project-note {{
  font-size: 15px;
  line-height: 24px;
  font-weight: 500;
  color: #3d3d3d;   /* sits over the hero graphic, so body-copy contrast, not muted grey */
  margin: 24px 0 0;
}}

.project-section {{ margin-top: 100px; }}
.project-section > h2 {{
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 14px;
  font-family: 'Inter', sans-serif;
  text-decoration: none;
  float: none;
  position: static;
  color: #191919;
}}
.project-section > p {{
  font-size: 18px;
  line-height: 29px;
  text-align: left;
  color: #3d3d3d;
  margin: 0 0 14px;
}}

/* ── Workflow rows (About page pattern) ── */
.ai-rows {{ margin-top: 40px; }}
.about-row {{
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 40px;
  padding: 48px 0;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}}
.ai-tiles {{
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}}
.ai-tile {{
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}}
.ai-tile svg {{ width: 24px; height: 24px; display: block; }}
.ai-tile-claude {{ background: #d97757; }}
.ai-tile-claude svg {{ fill: #fff; }}
.ai-tile-dark {{ background: #000; }}
.ai-tile-dark svg {{ fill: #fff; }}
.ai-tile-light {{ background: #fff; border: 1px solid rgba(0,0,0,0.1); }}
.ai-tile-light svg {{ fill: #000; }}
.ai-tile-fathom {{ background: #000; }}
html.dark .ai-tile-fathom {{ border: 1px solid rgba(255,255,255,0.16); }}
.ai-tile-comfy {{ background: #172dd7; }}
.ai-tile-comfy svg {{ fill: #f0ff41; }}
.ai-tile-fathom svg {{ width: 100%; height: 100%; }}
#wrap_project .about-row h2 {{
  font-family: 'Inter', sans-serif;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
  color: #191919;
  margin: 0;
  float: none;
  text-decoration: none;
  position: static;
}}
.about-row-body p {{
  font-size: 18px;
  line-height: 29px;
  color: #3d3d3d;
  margin: 0;
}}
.about-row-body p.ai-tools {{
  margin: 0 0 16px;
  font-size: 13px;
  line-height: 20px;
  color: #8a8a8a;
}}

/* ── Built with Claude Code: thumbnails that open each tool's own page
   on top of this page; closing it comes back here ── */
.tool-grid {{
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-top: 32px;
}}
.tool-card {{
  display: block;
  text-decoration: none;
  color: inherit;
  border-radius: 12px;
}}
.tool-card:after, .tool-card:hover:after {{ display: none; }}
.tool-card-thumb {{
  display: block;
  background: #ddd;
  border-radius: 12px;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  position: relative;
  transform: translateZ(0);   /* keeps the radius clipping the zoomed image in Safari */
  transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1),
              box-shadow 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}}
.tool-card-thumb img {{
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}}
/* Border + light white wash, both faded in on hover */
.tool-card-thumb:after {{
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  border: 1px solid transparent;
  background: rgba(255,255,255,0);
  pointer-events: none;
  transition: background 0.4s, border-color 0.4s;
}}
/* Hover: the card lifts onto a soft shadow, the screenshot drifts in a
   touch, and an arrow slides in after the label */
@media (hover: hover) {{
  .tool-card:hover .tool-card-thumb {{
    transform: translateY(-6px);
    box-shadow: 0 18px 40px -12px rgba(0,0,0,0.22);
  }}
  .tool-card:hover .tool-card-thumb img {{ transform: scale(1.04); }}
  .tool-card:hover .tool-card-thumb:after {{
    border-color: #d6d6d6;
    background: rgba(255,255,255,0.15);
  }}
  .tool-card:hover .tool-card-label > span:after {{ opacity: 1; transform: translateX(0); }}
}}
.tool-card:focus-visible {{
  outline: 2px solid #191919;
  outline-offset: 4px;
}}
.tool-card-label {{
  display: block;
  margin-top: 14px;
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  font-weight: 500;
  color: #191919;
  text-align: center;
}}
/* Arrow hangs off the right of the text, so the label stays centred */
.tool-card-label > span {{ position: relative; }}
.tool-card-label > span:after {{
  content: '→';
  position: absolute;
  left: 100%;
  margin-left: 6px;
  opacity: 0;
  transform: translateX(-6px);
  transition: opacity 0.3s, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}}
#content .tool-card, #content .tool-card img {{ cursor: pointer; }}

#content .project-details, #content .page-title {{ cursor: auto; }}

@media screen and (max-width: 760px) {{
  .about-row {{ grid-template-columns: 1fr; gap: 12px; padding: 32px 0; }}
  .tool-grid {{ grid-template-columns: 1fr; }}
  .project-section {{ margin-top: 80px; }}
}}

html.dark .ai-hero {{ background: #000; }}
html.dark .page-title h4 {{ color: #ececec; }}
html.dark .project-description {{ color: #ececec; }}
html.dark .project-note {{ color: #c4c4c4; }}
html.dark .project-section > h2 {{ color: #ececec; }}
html.dark .project-section > p,
html.dark .about-row-body p {{ color: #c4c4c4; }}
html.dark .about-row-body p.ai-tools {{ color: #8a8a8a; }}
html.dark #wrap_project .about-row h2 {{ color: #ececec; }}
html.dark .about-row {{ border-top-color: rgba(255, 255, 255, 0.12); }}
html.dark .ai-tile-dark {{ border: 1px solid rgba(255,255,255,0.16); }}
html.dark .ai-tile-light {{ border-color: transparent; }}
html.dark .tool-card-label {{ color: #ececec; }}
html.dark .tool-card-thumb {{ background: #262626; }}
@media (hover: hover) {{
  html.dark .tool-card:hover .tool-card-thumb {{ box-shadow: 0 18px 40px -12px rgba(0,0,0,0.7); }}
  html.dark .tool-card:hover .tool-card-thumb:after {{ border-color: #3a3a3a; background: rgba(0,0,0,0.15); }}
}}
html.dark .tool-card:focus-visible {{ outline-color: #ececec; }}

</style>
</head>
<body>

<div class="ai-hero" aria-hidden="true"><canvas class="ai-hero-canvas rails-canvas" data-rails="horn"></canvas></div>
<div class="page-title" id="top">
  <h4>AI-enabled designer</h4>
</div>
<img id="loader2" src="loading_good.gif" width="auto" height="auto" />

<div id="wrap_project" data-no-click-close>

  <div class="project-details">

    <p class="project-description">AI has changed how I design and build. I still lead with the problem, the user and the details, but I can now take an idea <strong>from first sketch to a launched product</strong> on my own.</p>
    <p class="project-description">Here's how AI fits into each stage of my workflow.</p>
    <p class="project-note">This portfolio and the projects on this page were built entirely with AI.</p>

    <div class="project-section">
      <h2>Built with Claude Code</h2>
      <p>When I moved to Porto, I used Claude Code to build small tools for settling in: learning Portuguese, understanding what a mortgage really costs, and finding a home near a good school.</p>
      <div class="tool-grid">
{cards}
      </div>
    </div>

    <div class="project-section">
      <h2>AI-native workflow</h2>
      <p>AI now runs through every stage of my process. What used to need a team and weeks now takes me days. My current setup looks like this:</p>

      <div class="ai-rows">
{rows}
      </div>
    </div>

  </div>
</div>

</body>
</html>
'''
open(out,'w',encoding='utf-8').write(html)
print('written')
