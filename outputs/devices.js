const arrow = '<span aria-hidden="true">↗</span>';

const safe = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function createWorkflow(host) {
  let tab = 'home';
  let detail = '';
  let venue = 'Time Square';
  let room = 'Переговорная 01';
  let time = '11:00';
  let bookings = [];
  let issues = [];
  let compact = false;
  host.className = 'device-showcase device-showcase--workflow';
  host.innerHTML = `<div class="wf-device-label"><span>WORKFLOW</span><span>UI / MOBILE</span></div><div class="wf-phone"><div class="wf-hardware" aria-hidden="true"><span>9:41</span><i></i><span>▮▮▮ ▰</span></div><div class="wf-app"><header class="wf-app-header"><span class="wf-brand">w<span>↗</span></span><span>ваш рабочий день</span><button type="button" data-wf-action="profile" aria-label="Открыть профиль">a/</button></header><div class="wf-page" tabindex="-1"></div><nav class="wf-tabs" aria-label="Разделы демо Workflow"><button type="button" data-wf-tab="home" aria-current="page"><span aria-hidden="true">⌂</span>Главная</button><button type="button" data-wf-tab="booking"><span aria-hidden="true">▦</span>Бронь</button><button type="button" data-wf-tab="requests"><span aria-hidden="true">☷</span>Заявки</button><button type="button" data-wf-tab="profile"><span aria-hidden="true">◉</span>Профиль</button></nav></div><div class="wf-home-indicator" aria-hidden="true"></div></div><div class="device-demo-caption"><span class="device-live-dot" aria-hidden="true"></span><span>Нажмите на экран — это живое демо<small>Интерактивное демо · тестовые данные</small></span></div><span class="device-announcement" role="status" aria-live="polite"></span>`;
  const page = host.querySelector('.wf-page');
  const announce = text => { host.querySelector('.device-announcement').textContent = text; };
  const back = '<button type="button" class="wf-back" data-wf-action="back">← Назад</button>';

  function render() {
    host.querySelectorAll('[data-wf-tab]').forEach(button => {
      if (button.dataset.wfTab === tab) button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });
    page.scrollTop = 0;
    page.classList.toggle('wf-page--compact', compact);
    if (tab === 'home' && detail === 'news') {
      page.innerHTML = `${back}<span class="wf-eyebrow">НОВОСТИ ПРОСТРАНСТВА</span><h4>Место для<br>новых идей.</h4><div class="wf-news-art" aria-hidden="true"><i></i><span>MAKE<br>SPACE.</span></div><p class="wf-body">В демо можно выбрать пространство, время и сохранить тестовую бронь. Всё работает прямо здесь.</p><button class="wf-primary" type="button" data-wf-action="booking">Выбрать переговорную ${arrow}</button>`;
    } else if (tab === 'home') {
      page.innerHTML = `<span class="wf-eyebrow">СРЕДА, ДЕНЬ ДЛЯ ИДЕЙ</span><h4>Хорошего<br>рабочего дня<span>.</span></h4><div class="wf-home-actions"><button type="button" data-wf-action="booking"><span aria-hidden="true">▦</span><b>Забронировать</b><small>Переговорные</small>${arrow}</button><button type="button" data-wf-action="requests"><span aria-hidden="true">☷</span><b>Создать заявку</b><small>Сервис и помощь</small>${arrow}</button></div><div class="wf-section-title"><b>В пространстве</b><span>01 / 01</span></div><button type="button" class="wf-news-card" data-wf-action="news"><span>МЕСТО ДЛЯ НОВЫХ ИДЕЙ</span><b>Работать.<br>Создавать.<br>Встречаться.</b><i aria-hidden="true">↗</i></button>${bookings.length ? `<button type="button" class="wf-booking-note" data-wf-action="booking">Ваша бронь · ${safe(bookings.at(-1).time)} ${arrow}</button>` : ''}`;
    } else if (tab === 'booking' && detail === 'confirmed') {
      const booking = bookings.at(-1);
      page.innerHTML = `<div class="wf-confirmation"><span class="wf-check" aria-hidden="true">✓</span><span class="wf-eyebrow">ТЕСТОВАЯ БРОНЬ СОХРАНЕНА</span><h4>Всё готово<span>.</span></h4><p>${safe(booking.venue)}<br>${safe(booking.room)}</p><div class="wf-confirm-time">Сегодня <b>${safe(booking.time)}</b><span>30 минут</span></div><small>Это локальное демо.<br>Реальное помещение не бронируется.</small><button type="button" class="wf-primary" data-wf-action="another">Ещё одна бронь ${arrow}</button></div>`;
    } else if (tab === 'booking') {
      page.innerHTML = `<span class="wf-eyebrow">ПРОСТРАНСТВО ДЛЯ РАЗГОВОРА</span><h4>Встретимся<span>?</span></h4><div class="wf-toggle" role="group" aria-label="Выбор пространства">${['Time Square','Venus'].map(name => `<button type="button" data-wf-venue="${name}" aria-pressed="${venue === name}">${name}</button>`).join('')}</div><label class="wf-field">Переговорная<select data-wf-room aria-label="Переговорная"><option${room==='Переговорная 01'?' selected':''}>Переговорная 01</option><option${room==='Переговорная 02'?' selected':''}>Переговорная 02</option></select></label><div class="wf-room"><span aria-hidden="true">▤</span><div><b>${safe(room)}</b><small>Демо · 4 места · экран</small></div><span>↗</span></div><span class="wf-input-label">Сегодня · свободное время</span><div class="wf-times" role="group" aria-label="Время бронирования">${['10:00','11:00','12:30','14:00','15:00','16:30'].map(value => `<button type="button" data-wf-time="${value}" aria-pressed="${time===value}">${value}</button>`).join('')}</div><button type="button" class="wf-primary" data-wf-action="confirm">Сохранить тестовую бронь ${arrow}</button>${bookings.length ? `<div class="wf-recent"><b>Ваши демо-брони</b>${bookings.slice(-3).map(booking => `<p>${safe(booking.venue)} <span>${safe(booking.time)}</span></p>`).join('')}</div>` : ''}`;
    } else if (tab === 'requests' && detail === 'new') {
      page.innerHTML = `${back}<span class="wf-eyebrow">ПОМОЖЕМ РАЗОБРАТЬСЯ</span><h4>Что случилось<span>?</span></h4><form class="wf-issue-form"><label class="wf-field">Категория<select name="category"><option>Оборудование</option><option>Помещение</option><option>Другое</option></select></label><label class="wf-field">Описание<textarea name="description" rows="3" required maxlength="180" placeholder="Например, настроить экран"></textarea></label><p class="wf-form-note">Заявка останется в этом демо. Отправки на сервер нет.</p><button type="submit" class="wf-primary">Создать тестовую заявку ${arrow}</button></form>`;
    } else if (tab === 'requests') {
      page.innerHTML = `<span class="wf-eyebrow">СЕРВИС И ПОМОЩЬ</span><h4>Ваши заявки<span>.</span></h4><button type="button" class="wf-primary" data-wf-action="new">Новая заявка <span aria-hidden="true">+</span></button><div class="wf-issue-list">${issues.length ? issues.map((issue,index) => `<details class="wf-issue"><summary><span><small>ДЕМО / ${String(index+1).padStart(2,'0')}</small><b>${safe(issue.category)}</b></span><i>Принята</i></summary><p>${safe(issue.description)}</p><small>Локальная тестовая заявка</small></details>`).join('') : `<div class="wf-empty"><span aria-hidden="true">☷</span><b>Здесь пока спокойно.</b><p>Создайте тестовую заявку,<br>чтобы попробовать интерфейс.</p></div>`}</div>`;
    } else if (tab === 'profile') {
      page.innerHTML = `<span class="wf-eyebrow">ЛИЧНОЕ ПРОСТРАНСТВО</span><div class="wf-profile-avatar" aria-hidden="true">a/</div><h4>@aremakk</h4><p class="wf-profile-sub">Frontend developer / demo profile</p><div class="wf-profile-stats"><div><b>${bookings.length}</b><span>демо-брони</span></div><div><b>${issues.length}</b><span>демо-заявки</span></div></div><button type="button" class="wf-setting" data-wf-action="compact" aria-pressed="${compact}"><span>Компактный вид</span><i aria-hidden="true">${compact?'✓':'○'}</i></button><button type="button" class="wf-setting" data-wf-action="reset"><span>Сбросить демо</span><i aria-hidden="true">↺</i></button><p class="wf-form-note">Интерактивная демонстрация интерфейса. Все данные тестовые.</p>`;
    }
  }

  host.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || !host.contains(button)) return;
    const action = button.dataset.wfAction;
    if (button.dataset.wfTab) { tab = button.dataset.wfTab; detail = ''; }
    else if (button.dataset.wfVenue) venue = button.dataset.wfVenue;
    else if (button.dataset.wfTime) time = button.dataset.wfTime;
    else if (action === 'news') detail = 'news';
    else if (['booking','requests','profile'].includes(action)) { tab = action; detail = ''; }
    else if (action === 'back' || action === 'another') detail = '';
    else if (action === 'new') detail = 'new';
    else if (action === 'confirm') { bookings.push({venue,room,time}); detail = 'confirmed'; announce('Тестовая бронь сохранена. Реальное помещение не бронируется.'); }
    else if (action === 'compact') compact = !compact;
    else if (action === 'reset') { bookings = []; issues = []; compact = false; announce('Демо сброшено.'); }
    else return;
    const focusedKey = button.dataset.wfTab ? ['data-wf-tab',button.dataset.wfTab] : button.dataset.wfVenue ? ['data-wf-venue',venue] : button.dataset.wfTime ? ['data-wf-time',time] : action === 'compact' ? ['data-wf-action','compact'] : null;
    render();
    if (focusedKey) host.querySelector(`[${focusedKey[0]}="${focusedKey[1]}"]`)?.focus({preventScroll:true});
    else if (!button.isConnected) page.focus({preventScroll:true});
  });
  host.addEventListener('change', event => {
    if (event.target.matches('[data-wf-room]')) { room = event.target.value; render(); host.querySelector('[data-wf-room]').focus({preventScroll:true}); }
  });
  host.addEventListener('submit', event => {
    if (!event.target.matches('.wf-issue-form')) return;
    event.preventDefault();
    const data = new FormData(event.target);
    const description = String(data.get('description') || '').trim();
    if (!description) return;
    issues.unshift({category:data.get('category'),description});
    detail = '';
    render();
    page.focus({preventScroll:true});
    announce('Тестовая заявка создана локально.');
  });
  render();
}

function createNarxoz(host) {
  let view = 'courses';
  let course = 0;
  let lesson = 0;
  let filter = 'all';
  const done = new Set();
  const courses = [
    {name:'Интерфейсы',label:'Frontend / demo',symbol:'{ }',lessons:['Сетка и композиция','Компоненты React','Состояние интерфейса'],points:84},
    {name:'TypeScript',label:'Engineering / demo',symbol:'TS',lessons:['Типы и контракты','Данные из API','Безопасные компоненты'],points:76},
    {name:'Дизайн систем',label:'Product / demo',symbol:'↗',lessons:['Визуальный язык','Библиотека компонентов','Сценарии пользователя'],points:91}
  ];
  host.className = 'device-showcase device-showcase--narxoz';
  host.innerHTML = `<div class="nx-device-label"><span>NARXOZ</span><span>UI / DESKTOP</span></div><div class="nx-computer"><div class="nx-display"><div class="nx-camera" aria-hidden="true"></div><div class="nx-browser" aria-hidden="true"><span><i></i><i></i><i></i></span><span>campus / interface-demo</span><span>↗</span></div><div class="nx-app"><aside class="nx-sidebar"><span class="nx-logo">N<span>→</span></span><span class="nx-sidebar-caption">LEARNING<br>SPACE</span><nav aria-label="Разделы демо Narxoz"><button type="button" data-nx-view="courses" aria-current="page"><span aria-hidden="true">▦</span>Курсы</button><button type="button" data-nx-view="lessons"><span aria-hidden="true">▤</span>Уроки</button><button type="button" data-nx-view="grades"><span aria-hidden="true">◫</span>Оценки</button></nav><div class="nx-demo-user"><span aria-hidden="true">a/</span><div>@aremakk<small>Демо-профиль</small></div></div></aside><div class="nx-content" tabindex="-1"></div></div></div><div class="nx-base" aria-hidden="true"><i></i></div></div><div class="device-demo-caption"><span class="device-live-dot" aria-hidden="true"></span><span>Откройте курс, урок или журнал<small>Интерактивное демо · тестовые данные</small></span></div><span class="device-announcement" role="status" aria-live="polite"></span>`;
  const content = host.querySelector('.nx-content');
  const lessonCopy = [
    ['Сильная основа интерфейса','Заголовок, контент и действие должны складываться в понятную иерархию. Начните с сетки и проверьте композицию на разных экранах.'],
    ['Маленькие части. Целая система.','Компонент объединяет поведение и визуальные состояния. Удобный API помогает использовать его последовательно во всём продукте.'],
    ['Продуманное состояние','Загрузка, пустой результат, ошибка и успешное действие — равноправные части интерфейса. Пользователю всегда нужен понятный следующий шаг.']
  ];

  function render() {
    host.querySelectorAll('[data-nx-view]').forEach(button => {
      if(button.dataset.nxView === view) button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });
    content.scrollTop = 0;
    const selected = courses[course];
    if (view === 'courses') {
      content.innerHTML = `<div class="nx-topline"><span>ОБЗОР ОБУЧЕНИЯ</span><span>ДЕМО / 01</span></div><div class="nx-heading"><div><h4>Ваш следующий шаг<span>↗</span></h4><p>Курсы, которые можно открыть.</p></div><span class="nx-course-count">03</span></div><div class="nx-course-grid">${courses.map((item,index) => `<button type="button" class="nx-course" data-nx-course="${index}"><span class="nx-course-icon" aria-hidden="true">${item.symbol}</span><small>${item.label}</small><b>${item.name}</b><span class="nx-course-progress"><i style="--progress:${[22,48,70][index]}%"></i></span><span class="nx-course-footer">3 демо-урока <i aria-hidden="true">↗</i></span></button>`).join('')}</div><div class="nx-bottom-note"><span>LEARN. BUILD. REPEAT.</span><span>Нажмите на любой курс ↑</span></div>`;
    } else if (view === 'lessons') {
      content.innerHTML = `<div class="nx-topline"><button type="button" data-nx-view="courses">← Все курсы</button><span>МАТЕРИАЛЫ КУРСА</span></div><div class="nx-heading nx-heading--lessons"><div><h4>${selected.name}<span>↗</span></h4><p>Демонстрация сценария обучения.</p></div><label class="nx-select-label"><span class="device-sr-only">Выберите курс</span><select data-nx-course-select>${courses.map((item,index) => `<option value="${index}"${course===index?' selected':''}>${item.name}</option>`).join('')}</select></label></div><div class="nx-lesson-layout"><div class="nx-lessons" role="group" aria-label="Уроки курса">${selected.lessons.map((name,index) => `<button type="button" data-nx-lesson="${index}" aria-pressed="${lesson===index}"><span>${done.has(`${course}-${index}`)?'✓':String(index+1).padStart(2,'0')}</span><b>${name}</b><i aria-hidden="true">↗</i></button>`).join('')}</div><article class="nx-lesson-detail"><span class="nx-lesson-kicker">КОНСПЕКТ / ${String(lesson+1).padStart(2,'0')}</span><h5>${lessonCopy[lesson][0]}</h5><p>${lessonCopy[lesson][1]}</p><button type="button" class="nx-primary" data-nx-action="complete" aria-pressed="${done.has(`${course}-${lesson}`)}">${done.has(`${course}-${lesson}`)?'Пройдено ✓':'Отметить пройденным →'}</button></article></div>`;
    } else {
      const visible = courses.map((item,index) => ({...item,index})).filter(item => filter !== 'high' || item.points >= 80);
      content.innerHTML = `<div class="nx-topline"><span>ЛИЧНЫЙ ЖУРНАЛ</span><span>ТЕСТОВЫЕ БАЛЛЫ</span></div><div class="nx-heading"><div><h4>Результат в деталях<span>↗</span></h4><p>Попробуйте изменить демо-оценку.</p></div><div class="nx-filter" role="group" aria-label="Фильтр оценок"><button type="button" data-nx-filter="all" aria-pressed="${filter==='all'}">Все</button><button type="button" data-nx-filter="high" aria-pressed="${filter==='high'}">80+</button></div></div><div class="nx-grade-table"><div class="nx-grade-head"><span>Дисциплина</span><span>Баллы / 100</span><span>Изменить</span></div>${visible.length ? visible.map(item => `<div class="nx-grade-row"><div><b>${item.name}</b><small>Тестовые данные</small></div><span class="nx-grade-number">${item.points}<i style="--progress:${item.points}%"></i></span><div class="nx-grade-controls"><button type="button" data-nx-grade="${item.index}" data-nx-delta="-1" aria-label="Уменьшить демо-балл: ${item.name}"${item.points===0?' disabled':''}>−</button><button type="button" data-nx-grade="${item.index}" data-nx-delta="1" aria-label="Увеличить демо-балл: ${item.name}"${item.points===100?' disabled':''}>+</button></div></div>`).join('') : '<p class="nx-no-grades">Пока нет оценок выше 80. Откройте «Все».</p>'}</div><div class="nx-bottom-note"><span>LOCAL INTERACTION</span><span>Изменения только в демо</span></div>`;
    }
  }
  host.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || !host.contains(button)) return;
    let focusSelector = '';
    if (button.dataset.nxView) view = button.dataset.nxView;
    else if (button.dataset.nxCourse !== undefined) { course = Number(button.dataset.nxCourse); lesson = 0; view = 'lessons'; }
    else if (button.dataset.nxLesson !== undefined) { lesson = Number(button.dataset.nxLesson); focusSelector = `[data-nx-lesson="${lesson}"]`; }
    else if (button.dataset.nxFilter) { filter = button.dataset.nxFilter; focusSelector = `[data-nx-filter="${filter}"]`; }
    else if (button.dataset.nxGrade !== undefined) {
      const index = Number(button.dataset.nxGrade);
      courses[index].points = Math.max(0, Math.min(100,courses[index].points + Number(button.dataset.nxDelta)));
      focusSelector = `[data-nx-grade="${index}"][data-nx-delta="${button.dataset.nxDelta}"]`;
      host.querySelector('.device-announcement').textContent = `${courses[index].name}: ${courses[index].points} тестовых баллов.`;
    } else if (button.dataset.nxAction === 'complete') {
      const key = `${course}-${lesson}`;
      if (done.has(key)) done.delete(key); else done.add(key);
      focusSelector = '[data-nx-action="complete"]';
    } else return;
    render();
    if (focusSelector) {
      let nextFocus = host.querySelector(focusSelector);
      if (!nextFocus || nextFocus.disabled) {
        nextFocus = button.dataset.nxGrade !== undefined
          ? host.querySelector(`[data-nx-grade="${button.dataset.nxGrade}"]:not(:disabled)`)
          : null;
        nextFocus ||= host.querySelector(`[data-nx-filter="${filter}"]`) || content;
      }
      nextFocus.focus({preventScroll:true});
    } else if (!button.isConnected) content.focus({preventScroll:true});
  });
  host.addEventListener('change', event => {
    if(event.target.matches('[data-nx-course-select]')) { course = Number(event.target.value); lesson = 0; render(); host.querySelector('[data-nx-course-select]').focus({preventScroll:true}); }
  });
  render();
}

export function initDevices(root = document) {
  root.querySelectorAll('[data-device]').forEach(host => {
    if (host.dataset.deviceReady) return;
    host.dataset.deviceReady = 'true';
    if (host.dataset.device === 'workflow') createWorkflow(host);
    else if (host.dataset.device === 'narxoz') createNarxoz(host);
  });
}
