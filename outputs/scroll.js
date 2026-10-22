const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const smooth = (start, end, value) => { const p = clamp((value - start) / (end - start)); return p * p * (3 - 2 * p); };
const mix = (a, b, p) => a + (b - a) * p;

// Shares main.js's RAF. Scroll stays native; no wheel interception or extra loop.
export class ScrollStory {
  constructor() {
    this.root = document.querySelector('.scroll-story');
    this.stage = this.root.querySelector('.story-stage');
    this.code = this.root.querySelector('.story-code');
    this.browser = this.root.querySelector('.story-browser');
    this.note = this.root.querySelector('.story-note');
    this.title = this.root.querySelector('.story-title');
    this.description = this.root.querySelector('.story-description');
    this.axis = this.root.querySelector('.story-axis');
    this.sculpture = this.root.querySelector('.story-sculpture');
    this.counter = this.root.querySelector('.story-counter');
    this.track = this.root.querySelector('.story-track i');
    this.chapters = [...this.root.querySelectorAll('.story-chapters>span')];
    this.cards = [...document.querySelectorAll('.project')].map(element => {
      const flight = document.createElement('div');
      flight.className = 'project-flight';
      flight.append(...element.childNodes);
      element.append(flight);
      return {element, flight, top:0, progress:-1};
    });
    this.headings = [...document.querySelectorAll('.section-heading')].map(element => ({element, heading:element.querySelector('h2'), top:0, progress:-1}));
    this.progress = null;
    this.lastDraw = -1;
    this.disabled = null;
    this.chapter = -1;
    document.body.classList.add('has-scroll-story');
  }

  resize() {
    this.top = this.root.getBoundingClientRect().top + scrollY;
    this.height = this.root.offsetHeight;
    this.viewport = innerHeight;
    this.travel = Math.max(1, this.height - this.stage.offsetHeight);
    this.mobile = innerWidth <= 760;
    this.cards.forEach(item => { item.top = item.element.getBoundingClientRect().top + scrollY; item.progress = -1; });
    this.headings.forEach(item => { item.top = item.element.getBoundingClientRect().top + scrollY; item.progress = -1; });
    this.progress = null;
    this.lastDraw = -1;
  }

  update(y, dt, disabled) {
    const changed = this.disabled !== disabled;
    this.disabled = disabled;
    if (changed) this.lastDraw = -1;
    const target = clamp((y - this.top) / this.travel);
    const visible = y + this.viewport > this.top && y < this.top + this.height;
    if (this.progress === null || disabled) this.progress = disabled ? .52 : target;
    else if (visible) this.progress += (target - this.progress) * (1 - Math.exp(-16 * dt));
    else this.progress = target;
    if ((visible || this.lastDraw < 0) && Math.abs(this.progress - this.lastDraw) > .00015) {
      this.draw(this.progress, disabled);
      this.lastDraw = this.progress;
    }
    this.cards.forEach(item => {
      if (item.element.hidden) return;
      const p = disabled ? 1 : smooth(.98, .54, (item.top - y) / this.viewport);
      if (Math.abs(p - item.progress) < .001) return;
      item.flight.style.setProperty('--flight-y', `${(1-p)*(this.mobile?28:65)}px`);
      item.flight.style.setProperty('--flight-rotation', `${(1-p)*(this.mobile?3:7)}deg`);
      item.progress = p;
    });
    this.headings.forEach(item => {
      const p = disabled ? 1 : smooth(.95, .62, (item.top - y) / this.viewport);
      if (Math.abs(p - item.progress) < .001) return;
      item.heading.style.setProperty('--heading-crop', `${(1-p)*100}%`);
      item.progress = p;
    });
  }

  draw(p, disabled) {
    const assemble = disabled ? 1 : smooth(.04,.67,p);
    const depart = disabled ? 0 : smooth(.73,1,p);
    const focus = disabled ? 0 : smooth(.45,.85,p);
    const mobile = this.mobile;
    const codeX = mix(mobile?-7:-5, mobile?-42:-55, assemble) - depart*16;
    this.code.style.transform = `translate3d(${codeX}%,${mix(11,-9,assemble)}%,${mix(-120,-260,assemble)}px) rotateX(${mix(16,-5,assemble)}deg) rotateY(${mix(23,-18,assemble)}deg) rotateZ(${mix(-14,-9,assemble)}deg) scale(${mix(.92,.84,assemble)})`;
    this.code.style.opacity = String(disabled? .95 : 1-smooth(.42,.8,p)*.75);
    const scale = disabled ? .98 : mix(.69,mobile?1.03:1.05,assemble) + depart*(mobile?.12:.15);
    this.browser.style.transform = `translate3d(${mix(mobile?9:12,mobile?-3:-8,assemble)-depart*3}%,${mix(22,-7,assemble)-depart*11}%,0) rotateX(${mix(23,0,assemble)}deg) rotateY(${mix(-29,0,assemble)}deg) rotateZ(${mix(11,0,assemble)-depart*3}deg) scale(${scale})`;
    this.note.style.transform = `translate3d(${mix(27,-7,assemble)}%,${mix(75,-14,assemble)+depart*75}%,50px) rotate(${mix(16,-6,assemble)}deg) scale(${mix(.78,1,assemble)})`;
    this.note.style.opacity = String(disabled ? 1 : smooth(.13,.4,p)*(1-depart));
    this.title.style.transform = `translate3d(${focus*-4}%,${focus*-23}%,0) scale(${1-focus*.1})`;
    this.title.style.opacity = String(1-focus*.8);
    this.description.style.opacity = String(1-focus*.5);
    this.description.style.transform = `translateY(${focus*-16}px)`;
    this.axis.style.transform = `rotate(${mix(-12,3,assemble)}deg) scale(${mix(.86,1.04,assemble)})`;
    this.axis.style.opacity = String(1-focus*.65);
    this.sculpture.style.transform = `rotate(${mix(-68,-17,assemble)}deg) rotateY(${mix(-35,20,assemble)}deg)`;
    this.track.style.transform = `scaleX(${p})`;
    this.counter.textContent = `${String(Math.round(p*100)).padStart(3,'0')} / 100`;
    const chapter = p < .3 ? 0 : p < .66 ? 1 : 2;
    if (chapter !== this.chapter) {
      this.chapters.forEach((element,index)=>element.classList.toggle('is-active',index===chapter));
      this.chapter = chapter;
    }
  }
}
