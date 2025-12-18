document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/api/activities");
      if (!response.ok) throw new Error("no api");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});

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
      return await res.json();
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
          li.innerHTML = `<span class="participant-avatar" aria-hidden="true"></span><span class="participant-email">${escapeHtml(p)}</span>`;
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
  const activityMap = {};
  activities.forEach(a => activityMap[a.id] = a);
  renderActivities(activities);

  // handle signups: update in-memory model and re-render the single card + select
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const actId = form.activity.value;
    if (!email || !actId) return;

    const act = activityMap[actId];
    if (!act) return;

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
          li.innerHTML = `<span class="participant-avatar" aria-hidden="true"></span><span class="participant-email">${escapeHtml(p)}</span>`;
          ul.appendChild(li);
        });
      }
      // show a brief message
      message.classList.remove('hidden');
      message.textContent = 'Signed up successfully!';
      setTimeout(() => { message.classList.add('hidden'); message.textContent = ''; }, 2500);
      form.reset();
    } else {
      message.classList.remove('hidden');
      message.textContent = 'You are already signed up.';
      setTimeout(() => { message.classList.add('hidden'); message.textContent = ''; }, 2000);
    }
  });
})();
