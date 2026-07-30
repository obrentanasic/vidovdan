/* =========================================================================
   <image-slot> — место за фотографију
   -------------------------------------------------------------------------
   У прототипу немамо праве фотографије, па свако фото-место црта
   детерминистичку дуотон плочу (градијент + гравирана шрафура + винијета).
   Иста комбинација атрибута увек даје исту слику, тако да прототип
   изгледа исто при сваком учитавању.

   Употреба:
     <image-slot tone="oxblood" seed="7" label="Фото"></image-slot>
     <image-slot tone="lapis" ratio="16/9"></image-slot>
     <image-slot tone="ink" round></image-slot>

   Замена правом сликом је једна линија — <img> уместо <image-slot>.
   ========================================================================= */

(function () {
  'use strict';

  const TONES = {
    oxblood: ['#4A0D18', '#8C1F2F', '#D2687A'],
    lapis:   ['#0E1D30', '#1E3A5C', '#6E9BD1'],
    gold:    ['#3B2A0A', '#8A6A18', '#E0C077'],
    ink:     ['#100D0B', '#332B24', '#7A6C5C'],
    olive:   ['#1B2317', '#3F4F30', '#93A472'],
    plum:    ['#231328', '#4C2A4F', '#A676A8']
  };

  const HATCH =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E" +
    "%3Cpath d='M-2 6 L6 -2 M2 14 L14 2 M10 18 L18 10' stroke='%23ffffff' stroke-width='1' " +
    "stroke-opacity='.5' fill='none'/%3E%3C/svg%3E";

  /* мали детерминистички генератор — исти seed, исти резултат */
  function rng(seed) {
    let s = (seed * 2654435761) % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
  }

  class ImageSlot extends HTMLElement {
    connectedCallback() {
      if (this._done) return;
      this._done = true;
      this.render();
    }

    static get observedAttributes() { return ['tone', 'seed', 'label', 'ratio', 'round']; }

    attributeChangedCallback() {
      if (this._done) this.render();
    }

    render() {
      const toneName = this.getAttribute('tone') || 'ink';
      const tone = TONES[toneName] || TONES.ink;
      const label = this.getAttribute('label');
      const ratio = this.getAttribute('ratio');
      const round = this.hasAttribute('round');

      const seedAttr = this.getAttribute('seed');
      const seed = seedAttr !== null
        ? (parseInt(seedAttr, 10) || hashString(seedAttr)) + 11
        : hashString(toneName + (label || '') + (this.textContent || '')) % 9973 + 3;

      const r = rng(seed);
      const ax = Math.round(12 + r() * 68);
      const ay = Math.round(10 + r() * 60);
      const bx = Math.round(20 + r() * 70);
      const by = Math.round(40 + r() * 60);
      const angle = Math.round(r() * 180);
      const hatchRot = Math.round(-24 + r() * 48);
      const spread = Math.round(48 + r() * 26);

      this.classList.add('slot');
      if (round) this.classList.add('slot--round');
      if (ratio) this.style.aspectRatio = ratio.replace('/', ' / ');

      const art = document.createElement('div');
      art.className = 'slot__art';
      art.style.background =
        'radial-gradient(' + spread + '% ' + (spread + 20) + '% at ' + ax + '% ' + ay + '%, ' +
          tone[2] + ' 0%, transparent 62%),' +
        'radial-gradient(70% 90% at ' + bx + '% ' + by + '%, ' + tone[1] + ' 0%, transparent 70%),' +
        'linear-gradient(' + angle + 'deg, ' + tone[0] + ' 0%, ' + tone[1] + ' 100%)';

      const grid = document.createElement('div');
      grid.className = 'slot__grid';
      grid.style.backgroundImage = 'url("' + HATCH + '")';
      grid.style.transform = 'rotate(' + hatchRot + 'deg) scale(1.6)';

      const vignette = document.createElement('div');
      vignette.className = 'slot__art';
      vignette.style.background =
        'radial-gradient(120% 120% at 50% 40%, transparent 40%, rgba(10,8,6,.55) 100%)';

      this.append(art, grid, vignette);

      if (label && !round) {
        const tag = document.createElement('span');
        tag.className = 'slot__label';
        tag.textContent = label;
        this.appendChild(tag);
      }
    }
  }

  if (!customElements.get('image-slot')) {
    customElements.define('image-slot', ImageSlot);
  }
})();
