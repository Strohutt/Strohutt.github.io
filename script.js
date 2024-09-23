// Initialize particles.js for background
particlesJS('particles-js', {
  "particles": {
    "number": {
      "value": 80,
      "density": {
        "enable": true,
        "value_area": 800
      }
    },
    "color": {
      "value": "#ffffff"
    },
    "shape": {
      "type": "circle",
      "stroke": {
        "width": 0,
        "color": "#000000"
      }
    },
    "opacity": {
      "value": 0.5,
      "random": false
    },
    "size": {
      "value": 3,
      "random": true
    },
    "line_linked": {
      "enable": true,
      "distance": 150,
      "color": "#ffffff",
      "opacity": 0.4,
      "width": 1
    },
    "move": {
      "enable": true,
      "speed": 3,
      "direction": "none",
      "random": false,
      "straight": false,
      "out_mode": "out",
      "bounce": false
    }
  },
  "interactivity": {
    "detect_on": "canvas",
    "events": {
      "onhover": {
        "enable": true,
        "mode": "grab"
      },
      "onclick": {
        "enable": true,
        "mode": "push"
      },
      "resize": true
    },
    "modes": {
      "grab": {
        "distance": 140,
        "line_linked": {
          "opacity": 1
        }
      },
      "bubble": {
        "distance": 400,
        "size": 40,
        "duration": 2,
        "opacity": 8,
        "speed": 3
      },
      "repulse": {
        "distance": 200,
        "duration": 0.4
      },
      "push": {
        "particles_nb": 4
      },
      "remove": {
        "particles_nb": 2
      }
    }
  },
  "retina_detect": true
});

// Fetch Discord profile data from Lanyard API
window.onload = function() {
    fetch('https://api.lanyard.rest/v1/users/402858450926829568')
        .then(response => response.json())
        .then(data => {
            const discordData = data.data;

            // Debug: Log the data fetched from Lanyard API
            console.log('Discord Data:', discordData);

            // Update Discord avatar
            const avatarUrl = `https://cdn.discordapp.com/avatars/${discordData.discord_user.id}/${discordData.discord_user.avatar}.png`;
            document.getElementById('discord-avatar').src = avatarUrl;

            // Update Discord username
            const username = `${discordData.discord_user.username}`;
            document.getElementById('discord-username').textContent = username;

            // Get user status and apply status badge class
            const status = discordData.discord_status;
            const statusBadge = document.getElementById('discord-status-badge');
            statusBadge.classList.remove('status-online', 'status-idle', 'status-dnd', 'status-offline');
            if (status === 'online') {
                statusBadge.classList.add('status-online');
                document.getElementById('discord-status').textContent = "Online";
            } else if (status === 'idle') {
                statusBadge.classList.add('status-idle');
                document.getElementById('discord-status').textContent = "Idle";
            } else if (status === 'dnd') {
                statusBadge.classList.add('status-dnd');
                document.getElementById('discord-status').textContent = "Do Not Disturb";
            } else {
                statusBadge.classList.add('status-offline');
                document.getElementById('discord-status').textContent = "Offline";
            }

            // Handle activities (e.g., playing games or coding)
            if (discordData.activities.length > 0) {
                const activities = discordData.activities.map(activity => {
                    if (activity.type === 0) { // Activity such as gaming or coding
                        const activityName = activity.name;
                        const activityDetails = activity.details || "No details available";
                        const activityState = activity.state || "";

                        // Calculate elapsed time
                        const startTime = activity.timestamps ? new Date(activity.timestamps.start) : null;
                        let elapsedTime = "";
                        if (startTime) {
                            const now = new Date();
                            const seconds = Math.floor((now - startTime) / 1000);
                            const hours = String(Math.floor(seconds / 3600)).padStart(2, '0');
                            const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
                            const remainingSeconds = String(seconds % 60).padStart(2, '0');
                            elapsedTime = `${hours}:${minutes}:${remainingSeconds}`;
                        }

                        // Construct the image URL for the activity
                        let activityImageUrl = '';
                        if (activity.assets && activity.assets.large_image) {
                            activityImageUrl = `https://cdn.discordapp.com/app-assets/${activity.application_id}/${activity.assets.large_image}.png`;
                        }

                        // Create a formatted activity block
                        return `
                            <div class="activity-details">
                                ${activityImageUrl ? `<img class="activity-icon" src="${activityImageUrl}" alt="${activityName}">` : ''}
                                <div class="activity-info">
                                    <h3>${activityName}</h3>
                                    <p>${activityDetails} ${activityState}</p>
                                    ${elapsedTime ? `<p class="elapsed-time">Elapsed: ${elapsedTime}</p>` : ''}
                                </div>
                            </div>
                        `;
                    }
                    return '';
                }).join('');

                document.getElementById('discord-activities').innerHTML = activities.length ? activities : 'No current activity';
            } else {
                document.getElementById('discord-activities').textContent = 'No current activity';
            }

        })
        .catch(error => {
            console.error('Error fetching Discord data:', error);
            document.getElementById('discord-status').textContent = 'Error fetching status';
            document.getElementById('discord-activities').textContent = 'Error fetching activities';
        });
};
