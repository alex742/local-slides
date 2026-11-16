import { baseElement, newSlide, newText, themes, uid, type Deck, type DemoElement } from './model';

export const defaultDemo: Pick<DemoElement, 'html' | 'css' | 'js'> = {
  html: `<main><div class="top"><span class="logo">◈</span><b>Orbit</b><span class="tag">LIVE DEMO</span></div><h1>A small idea.<br>A working product.</h1><p>A tiny project board, right inside your presentation.</p><form><input aria-label="New task" placeholder="What's the next big thing?"><button>Add task ↗</button></form><div id="tasks"><label><input type="checkbox" checked><span>Find a better way to present</span></label><label><input type="checkbox"><span>Make the demo feel effortless</span></label><label><input type="checkbox"><span>Let the audience explore</span></label></div><footer><span id="progress">1 of 3 complete</span><span>Built for the moment.</span></footer></main>`,
  css: `*{box-sizing:border-box}body{margin:0;background:#fff;color:#222536;font:15px system-ui}main{padding:30px 34px}.top{display:flex;align-items:center;gap:9px}.logo{color:#7153e8;font-size:26px}.tag{margin-left:auto;font-size:9px;letter-spacing:1.5px;color:#7153e8;background:#efeafb;padding:7px 9px;border-radius:5px}h1{font-size:34px;line-height:1.12;letter-spacing:-1.2px;margin:30px 0 13px}p{color:#827d8b;font-size:13px}form{display:flex;gap:8px;margin:24px 0 14px}form input{min-width:0;flex:1;background:#f6f5f9;border:1px solid #edeaf3;border-radius:7px;padding:12px;font:inherit;font-size:12px}button{border:0;border-radius:7px;background:#7153e8;color:white;padding:12px 15px;cursor:pointer;font-weight:600}#tasks{display:grid;gap:6px}label{display:flex;align-items:center;gap:12px;padding:13px 11px;background:#faf9fc;border-radius:7px;font-size:13px}input[type=checkbox]{accent-color:#7153e8;width:16px;height:16px}label:has(:checked) span{color:#a29baa;text-decoration:line-through}footer{display:flex;justify-content:space-between;color:#9991a3;font-size:10px;margin-top:24px}`,
  js: `const form=document.querySelector('form');const tasks=document.querySelector('#tasks');function update(){const all=tasks.querySelectorAll('input');const done=tasks.querySelectorAll('input:checked');document.querySelector('#progress').textContent=done.length+' of '+all.length+' complete';}tasks.addEventListener('change',update);form.addEventListener('submit',event=>{event.preventDefault();const field=form.querySelector('input');if(!field.value.trim())return;const label=document.createElement('label');const check=document.createElement('input');check.type='checkbox';const text=document.createElement('span');text.textContent=field.value;label.append(check,text);tasks.append(label);field.value='';update();});`,
};

export function createSampleDeck(): Deck {
  const theme = themes[0];
  const cover = newSlide(theme);
  cover.name = 'A little more live';
  cover.notes =
    'Welcome everyone. This deck is a starting point: every element can be edited, moved, or replaced. On the third slide, try the interactive demo.';
  cover.elements = [
    {
      ...newText('LOCAL SLIDES / STUDIO', 84, 70, 650, 34),
      fontSize: 17,
      fontFamily: 'Inter',
      fontWeight: 500,
      color: theme.accent,
    },
    {
      ...newText('Good stories<br>deserve a<br>live moment.', 80, 161, 835, 350),
      fontSize: 94,
      fontWeight: 600,
      lineHeight: 1.05,
    },
    {
      ...newText('Make something worth showing.', 87, 580, 750, 60),
      fontSize: 25,
      fontFamily: 'Inter',
      fontWeight: 400,
      color: theme.muted,
    },
    {
      ...baseElement(960, 165, 235, 235),
      kind: 'shape',
      shape: 'ellipse',
      fill: theme.soft,
      stroke: theme.soft,
      strokeWidth: 0,
      radius: 0,
    },
    {
      ...baseElement(1003, 345, 155, 155),
      kind: 'shape',
      shape: 'rectangle',
      fill: theme.accent,
      stroke: theme.accent,
      strokeWidth: 0,
      radius: 24,
      rotation: 15,
    },
    {
      ...newText('01 — A NEW WAY TO PRESENT', 87, 665, 700, 25),
      fontSize: 12,
      fontFamily: 'Inter',
      fontWeight: 500,
      color: theme.muted,
    },
  ];
  const story = newSlide(theme);
  story.name = 'From story to something real';
  story.notes =
    'A great demo should feel like part of the story. Create the context, show the product, then invite people to try it.';
  story.elements = [
    {
      ...newText('THE IDEA', 84, 64, 600, 32),
      fontSize: 16,
      fontFamily: 'Inter',
      color: theme.accent,
    },
    {
      ...newText('From story to<br>something real.', 80, 130, 1050, 210),
      fontSize: 76,
      lineHeight: 1.08,
    },
    ...['Set the scene', 'Show the product', 'Make it tangible'].flatMap((title, i) => [
      {
        ...baseElement(84 + i * 380, 408, 354, 174),
        kind: 'shape' as const,
        shape: 'rectangle' as const,
        fill: i === 1 ? theme.accent : theme.soft,
        stroke: theme.soft,
        strokeWidth: 0,
        radius: 14,
      },
      {
        ...newText(`0${i + 1}`, 106 + i * 380, 430, 270, 40),
        fontSize: 20,
        color: i === 1 ? '#FFFFFF' : theme.accent,
      },
      {
        ...newText(title, 106 + i * 380, 495, 300, 60),
        fontSize: 27,
        color: i === 1 ? '#FFFFFF' : theme.foreground,
      },
    ]),
    {
      ...newText('A presentation that moves with your ideas.', 87, 655, 1000, 32),
      fontSize: 17,
      fontFamily: 'Inter',
      fontWeight: 400,
      color: theme.muted,
    },
  ];
  const live = newSlide(theme);
  live.name = 'Try it right here';
  live.notes =
    'Start demo sharing and select this speaker tab. Add a task or check one off in Orbit. The audience sees the same live instance, while these notes stay private.';
  live.elements = [
    {
      ...newText('THE LIVE MOMENT', 80, 72, 490, 34),
      fontSize: 16,
      fontFamily: 'Inter',
      color: theme.accent,
    },
    {
      ...newText('Less talking.<br>More trying.', 78, 174, 500, 220),
      fontSize: 67,
      lineHeight: 1.1,
    },
    {
      ...newText('Your product. Your audience.<br>One uninterrupted story.', 84, 443, 440, 125),
      fontSize: 23,
      fontFamily: 'Inter',
      fontWeight: 400,
      color: theme.muted,
      lineHeight: 1.5,
    },
    {
      ...baseElement(625, 65, 572, 590),
      kind: 'demo',
      mode: 'authored',
      title: 'Orbit — a tiny project board',
      ...defaultDemo,
      url: '',
    },
  ];
  return {
    schemaVersion: 1,
    id: uid(),
    title: 'A little more live',
    width: 1280,
    height: 720,
    theme,
    slides: [cover, story, live],
    assets: {},
  };
}
