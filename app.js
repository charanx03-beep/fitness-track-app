// State
let activities = JSON.parse(localStorage.getItem('fittrack_activities')) || [];

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.section');
const activityForm = document.getElementById('activity-form');
const activityTypeSelect = document.getElementById('activity-type');
const stepsGroup = document.getElementById('steps-group');
const activityList = document.getElementById('activity-list');
const clearDataBtn = document.getElementById('clear-data-btn');

// Stats Elements
const elTotalSteps = document.getElementById('total-steps');
const elStepsProgress = document.getElementById('steps-progress');
const elTotalCalories = document.getElementById('total-calories');
const elTotalDuration = document.getElementById('total-duration');

// Chart Instance
let activityChart = null;

// Icons mapping for different activities
const iconMap = {
    'Running': 'ph-person-simple-run',
    'Cycling': 'ph-bicycle',
    'Walking': 'ph-person-simple-walk',
    'Swimming': 'ph-swimming-pool',
    'Yoga': 'ph-person-simple-tai-chi',
    'Weightlifting': 'ph-barbell',
    'Other': 'ph-activity'
};

// Initialize App
function init() {
    setupNavigation();
    setupForm();
    updateUI();
    
    // Set default date to today
    document.getElementById('activity-date').valueAsDate = new Date();
}

// Navigation Logic
function setupNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active from all
            navItems.forEach(nav => nav.classList.remove('active'));
            sections.forEach(sec => sec.classList.remove('active'));
            
            // Add active to clicked
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            // Render chart if dashboard is opened
            if (targetId === 'dashboard') {
                renderChart();
            }
        });
    });
}

// Form Logic
function setupForm() {
    // Show/Hide steps input based on activity type
    activityTypeSelect.addEventListener('change', (e) => {
        const type = e.target.value;
        if (['Walking', 'Running'].includes(type)) {
            stepsGroup.style.display = 'block';
        } else {
            stepsGroup.style.display = 'none';
            document.getElementById('activity-steps').value = ''; // clear steps
        }
    });

    activityForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const newActivity = {
            id: Date.now().toString(),
            type: activityTypeSelect.value,
            duration: parseInt(document.getElementById('activity-duration').value),
            calories: parseInt(document.getElementById('activity-calories').value),
            steps: parseInt(document.getElementById('activity-steps').value) || 0,
            date: document.getElementById('activity-date').value
        };

        activities.push(newActivity);
        saveData();
        
        // Reset form
        activityForm.reset();
        document.getElementById('activity-date').valueAsDate = new Date();
        stepsGroup.style.display = 'none';

        // Notify user
        alert('Activity logged successfully!');
        
        // Update UI
        updateUI();
        
        // Switch to Dashboard
        navItems[0].click();
    });

    clearDataBtn.addEventListener('click', () => {
        if(confirm('Are you sure you want to delete all activity history?')) {
            activities = [];
            saveData();
            updateUI();
        }
    });
}

function saveData() {
    localStorage.setItem('fittrack_activities', JSON.stringify(activities));
}

// Update UI
function updateUI() {
    calculateStats();
    renderHistory();
    renderChart();
}

function calculateStats() {
    let totalSteps = 0;
    let totalCalories = 0;
    let totalDuration = 0;

    // Optional: Filter for current week or month. For now, showing all-time or last 7 days.
    // Let's calculate total for the past 7 days to match 'Weekly' dashboard concept.
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    activities.forEach(act => {
        const actDate = new Date(act.date);
        if (actDate >= oneWeekAgo) {
            totalSteps += act.steps;
            totalCalories += act.calories;
            totalDuration += act.duration;
        }
    });

    elTotalSteps.textContent = totalSteps.toLocaleString();
    elTotalCalories.textContent = `${totalCalories.toLocaleString()} kcal`;
    elTotalDuration.textContent = `${totalDuration} min`;

    // Target progress (10,000 steps per week as demo target)
    // Actually, let's say 50,000 steps per week target
    const targetSteps = 50000;
    let progressPercent = (totalSteps / targetSteps) * 100;
    if (progressPercent > 100) progressPercent = 100;
    elStepsProgress.style.width = `${progressPercent}%`;
    
    document.querySelector('.stat-target').textContent = `Target: ${targetSteps.toLocaleString()} / week`;
}

function renderHistory() {
    activityList.innerHTML = '';

    if (activities.length === 0) {
        activityList.innerHTML = `
            <div class="empty-state">
                <i class="ph ph-wind"></i>
                <p>No activities found. Time to get moving!</p>
            </div>
        `;
        return;
    }

    // Sort by date descending
    const sortedActivities = [...activities].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedActivities.forEach(act => {
        const li = document.createElement('li');
        li.className = 'activity-item';
        
        const iconClass = iconMap[act.type] || iconMap['Other'];
        
        // Format date
        const dateObj = new Date(act.date);
        const dateString = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

        li.innerHTML = `
            <div class="activity-icon-col">
                <div class="activity-icon">
                    <i class="ph ${iconClass}"></i>
                </div>
                <div class="activity-details">
                    <h4>${act.type}</h4>
                    <p>${dateString} • ${act.steps > 0 ? act.steps + ' steps' : 'No steps tracked'}</p>
                </div>
            </div>
            <div class="activity-stats">
                <div class="kcal">+${act.calories} kcal</div>
                <div class="duration">${act.duration} min</div>
            </div>
        `;
        activityList.appendChild(li);
    });
}

function renderChart() {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;

    // Process data for the last 7 days
    const last7Days = [];
    const caloriesData = [];
    
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        // Format label
        last7Days.push(d.toLocaleDateString(undefined, { weekday: 'short' }));
        
        // Sum calories for this day
        const dayCalories = activities
            .filter(act => act.date === dateStr)
            .reduce((sum, act) => sum + act.calories, 0);
            
        caloriesData.push(dayCalories);
    }

    if (activityChart) {
        activityChart.destroy();
    }

    // Chart.js global defaults for dark theme
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Inter', sans-serif";

    activityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: last7Days,
            datasets: [{
                label: 'Calories Burned',
                data: caloriesData,
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                borderRadius: 6,
                hoverBackgroundColor: '#10b981'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Start
document.addEventListener('DOMContentLoaded', init);
