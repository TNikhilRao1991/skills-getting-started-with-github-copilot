// NOTE: removed duplicate DOMContentLoaded fetch/signup block. The
// IIFE below now handles loading activities and syncing signups with
// the backend so the UI stays in sync without needing a page refresh.

// minimal sanitizer for text nodes
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// load and render
(async function () {
  const container = document.getElementById('activities-list');
  const tpl = document.getElementById('activity-card-template');
  const select = document.getElementById('activity');
  const form = document.getElementById('signup-form');
  const message = document.getElementById('message');

  // Fetch activities from API or use fallback sample
  async function loadActivities() {
    try {
      const res = await fetch('/api/activities');
      if (!res.ok) throw new Error('no api');
      const data = await res.json();
      // normalize server response (object) to array format expected by render
      if (Array.isArray(data)) return data;
      return Object.entries(data).map(([name, details]) => ({
        id: name,
        title: name,
        meta: details.schedule || '',
        description: details.description || '',
        participants: Array.isArray(details.participants) ? details.participants.slice() : []
      }));
    } catch {
      return [
        { id: 'chess', title: 'Chess Club', meta: 'Fridays • 3:30pm', description: 'Strategy and tournaments.', participants: ['alice@mergington.edu'] },
        { id: 'robotics', title: 'Robotics Team', meta: 'Mon/Wed • 4:00pm', description: 'Build and program robots.', participants: [] },
        { id: 'drama', title: 'Drama Club', meta: 'Thu • 5:00pm', description: 'Performances and workshops.', participants: ['j.doe@mergington.edu', 's.smith@mergington.edu'] }
      ];
    }
  }

  function renderActivities(activities) {
    container.innerHTML = '';
    select.innerHTML = '<option value="">-- Select an activity --</option>';

    activities.forEach(act => {
      // populate select
      const opt = document.createElement('option');
      opt.value = act.id;
      opt.textContent = act.title;
      select.appendChild(opt);

      // render card from template
      const node = tpl.content.cloneNode(true);
      node.querySelector('.activity-title').textContent = act.title;
      node.querySelector('.activity-meta').textContent = act.meta || '';
      node.querySelector('.activity-description').textContent = act.description || '';
      const ul = node.querySelector('.participants-list');

      if (Array.isArray(act.participants) && act.participants.length) {
        act.participants.forEach(p => {
          const li = document.createElement('li');
          li.innerHTML = `<span class="participant-avatar" aria-hidden="true"></span><span class="participant-email">${escapeHtml(p)}</span><button class="participant-remove" data-email="${escapeHtml(p)}" aria-label="Remove participant">×</button>`;
          ul.appendChild(li);
        });
      } else {
        const li = document.createElement('li');
        li.className = 'no-participants';
        li.textContent = 'No participants yet';
        ul.appendChild(li);
      }

      // attach a data attribute so signup updates the right card
      const article = node.querySelector('.activity-card');
      article.dataset.activityId = act.id;
      container.appendChild(node);
    });
  }

  const activities = await loadActivities();
  // keep in-memory map to update participants on signup
  let activityMap = {};
  activities.forEach(a => activityMap[a.id] = a);
  renderActivities(activities);
  // handle signups: call backend, update in-memory model and re-render the single card + select
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const actId = form.activity.value;
    if (!email || !actId) return;

    const act = activityMap[actId];
    if (!act) return;

    try {
      const resp = await fetch(`/activities/${encodeURIComponent(actId)}/signup?email=${encodeURIComponent(email)}`, { method: 'POST' });
      const body = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        message.classList.remove('hidden');
        message.textContent = body.detail || 'Failed to sign up';
        message.classList.add('error');
        setTimeout(() => { message.classList.add('hidden'); message.textContent = ''; message.classList.remove('error'); }, 3000);
        return;
      }

      // add if not already present
      if (!act.participants.includes(email)) {
        act.participants.push(email);
        // update the single card DOM
        const card = container.querySelector(`.activity-card[data-activity-id="${actId}"]`);
        if (card) {
          const ul = card.querySelector('.participants-list');
          ul.innerHTML = '';
          act.participants.forEach(p => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="participant-avatar" aria-hidden="true"></span><span class="participant-email">${escapeHtml(p)}</span><button class="participant-remove" data-email="${escapeHtml(p)}" aria-label="Remove participant">×</button>`;
            ul.appendChild(li);
          });
        }
      }

      // show a brief message
      message.classList.remove('hidden');
      message.textContent = body.message || 'Signed up successfully!';
      setTimeout(() => { message.classList.add('hidden'); message.textContent = ''; }, 2500);
      form.reset();
    } catch (err) {
      console.error('Signup error', err);
      message.classList.remove('hidden');
      message.textContent = 'Failed to sign up. Please try again.';
      message.classList.add('error');
      setTimeout(() => { message.classList.add('hidden'); message.textContent = ''; message.classList.remove('error'); }, 3000);
    }
  });

  // Delegated handler: remove (unregister) participant when remove button clicked
  container.addEventListener('click', async (e) => {
    const btn = e.target.closest && e.target.closest('.participant-remove');
    if (!btn) return;
    const li = btn.closest('li');
    const card = btn.closest('.activity-card');
    if (!card) return;
    const activityId = card.dataset.activityId;
    const email = btn.dataset.email;

    btn.disabled = true;
    try {
      const resp = await fetch(`/activities/${encodeURIComponent(activityId)}/unregister?email=${encodeURIComponent(email)}`, { method: 'POST' });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to unregister');
      }

      // Update in-memory model
      const act = activityMap[activityId];
      if (act && Array.isArray(act.participants)) {
        const idx = act.participants.indexOf(email);
        if (idx !== -1) act.participants.splice(idx, 1);
      }

      // Remove from DOM
      if (li) li.remove();
    } catch (err) {
      console.error('Unregister error', err);
      btn.disabled = false;
    }
  });
})();
