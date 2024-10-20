const apiKey = '8f19ca9d0580451ae99e75905e0d3cea';
let isCelsius = true; 

document.getElementById('dashboard-link').addEventListener('click', () => {
    showSection('dashboard');
});

document.getElementById('tables-link').addEventListener('click', () => {
    showSection('tables');
});

document.getElementById('get-weather').addEventListener('click', () => {
    const city = document.getElementById('city-input').value;
    const lat = document.getElementById('lat-input').value;
    const lon = document.getElementById('lon-input').value;

    if (lat && lon) {
        fetchWeatherData(null, lat, lon).then(() => {
            fetchForecastData(null, lat, lon);
        });
    } else if (city) {
        fetchWeatherData(city).then(() => {
            fetchForecastData(city);
        });
    } else {
        alert('Please enter a city or latitude/longitude coordinates');
    }
});

// Function to toggle section visibility
function showSection(section) {
    const dashboard = document.getElementById('dashboard-section');
    const tables = document.getElementById('tables-section');

    if (section === 'dashboard') {
        dashboard.style.display = 'block';
        tables.style.display = 'none';
    } else if (section === 'tables') {
        tables.style.display = 'block';
        dashboard.style.display = 'none';
    } else {
        dashboard.style.display = 'none';
        tables.style.display = 'none';
    }
}

// Initially hide both sections
showSection();

// Weather Data Fetch
async function fetchWeatherData(city, lat = null, lon = null) {
    const unit = isCelsius ? 'metric' : 'imperial'; 
    let url;

    if (lat && lon) {
        url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${unit}`;
    } else {
        url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=${unit}`;
    }

    try {
        const response = await fetch(url);
        const data = await response.json();
        displayWeather(data); // Display weather data on the UI
        return data; 
    } catch (error) {
        alert('City or coordinates not found');
        return null; 
    }
}

// Function to display weather details
function displayWeather(data) {
    const weatherDesc = data.weather[0].description;
    const iconCode = data.weather[0].icon;
    const temperature = data.main.temp;
    const humidity = data.main.humidity;
    const windSpeed = data.wind.speed;

    const widget = document.getElementById('weather-widget');
    widget.innerHTML = `
        <h3>${data.name}</h3>
        <p>Weather: ${weatherDesc}</p>
        <p>Temp: ${temperature} °${isCelsius ? 'C' : 'F'}</p>
        <p>Humidity: ${humidity}%</p>
        <p>Wind Speed: ${windSpeed} ${isCelsius ? 'm/s' : 'mph'}</p>
        <img src="https://openweathermap.org/img/wn/${iconCode}@2x.png" alt="Weather icon">
        <button id="toggle-temp" class="btn btn-secondary mt-2">Toggle to ${isCelsius ? 'Fahrenheit' : 'Celsius'}</button>
    `;

    document.getElementById('toggle-temp').addEventListener('click', toggleTemperature.bind(null, data.name));

    updateBackground(iconCode);
}

// Function to update the background based on weather condition
function updateBackground(iconCode) {
    const videoElement = document.getElementById('background-video');
    let videoUrl = '';

    switch (iconCode) {
        case '01d': videoUrl = './clearsky.mp4'; break;
        case '01n': videoUrl = './clearsky.mp4'; break;
        case '02d': case '02n': videoUrl = './fewclouds.mp4'; break;
        case '03d': case '03n': videoUrl = './scatteredclouds.mp4'; break;
        case '04d': case '04n': videoUrl = './brokenclouds.mp4'; break;
        case '09d': case '09n': videoUrl = './rainy.mp4'; break;
        case '10d': case '10n': videoUrl = './thunder.mp4'; break;
        case '11d': case '11n': videoUrl = './thunder.mp4'; break;
        case '13d': case '13n': videoUrl = './snow.mp4'; break;
        case '50d': case '50n': videoUrl = './mist.mp4'; break;
        default: videoUrl = './clearsky.mp4';
    }

    // Set the video source and load the video
    videoElement.src = videoUrl;
    videoElement.load(); // Reload the video to apply the source change

    // Optional: fallback to image background if the video fails to load
    videoElement.onerror = () => {
        document.body.style.backgroundImage = `url('./images/fallback-image.jpg')`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundPosition = 'center';
    };
}


// Function to toggle temperature between Celsius and Fahrenheit
function toggleTemperature(city) {
    isCelsius = !isCelsius;
    fetchWeatherData(city);
}



// Listen for dropdown selection changes
document.getElementById('sort-options').addEventListener('change', (event) => {
    const selectedOption = event.target.value;
    applySortOrFilter(selectedOption);
});

// Function to apply the sort or filter based on the user's selection
function applySortOrFilter(option) {
    let sortedOrFilteredData;

    switch(option) {
        case 'ascend':
            sortedOrFilteredData = getHourlyForecast(currentWeatherData).sort((a, b) => a.temp - b.temp);
            break;
        case 'descend':
            sortedOrFilteredData = getHourlyForecast(currentWeatherData).sort((a, b) => b.temp - a.temp);
            break;
        case 'rainy':
            sortedOrFilteredData = getHourlyForecast(currentWeatherData).filter(item => item.condition.toLowerCase().includes('rain'));
            break;
        case 'hottest':
            sortedOrFilteredData = [getHourlyForecast(currentWeatherData).reduce((max, item) => item.temp > max.temp ? item : max)];
            break;
        default:
            sortedOrFilteredData = getHourlyForecast(currentWeatherData); // Default, unmodified data
    }

    populateTable(sortedOrFilteredData);
}

// Store weather data globally so it can be used in filtering/sorting
let currentWeatherData = []; // This will hold the weather forecast data

// Global Variables to Hold Chart Instances
let barChartInstance, doughnutChartInstance, lineChartInstance;

// Fetch Forecast Data and Immediately Populate Table and Update Charts
async function fetchForecastData(city, lat = null, lon = null) {
    let url;

    if (lat && lon) {
        url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    } else {
        url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();

        currentWeatherData = data.list; // Store the forecast data globally
        const hourlyForecast = getHourlyForecast(currentWeatherData); // Parse the forecast data into hourly data
        
        populateTable(hourlyForecast); // Populate the table with the default fetched forecast data
        updateCharts(hourlyForecast);  // Update the charts with the fetched data
        
    } catch (error) {
        console.error('Forecast Fetch Error:', error);
        alert(`Unable to fetch forecast: ${error.message}`);
    }
}

// Function to Populate the Table with Fetched Data
function populateTable(data) {
    const table = document.getElementById('weather-table');
    table.innerHTML = '<tr><th>Date</th><th>Temp (°C)</th><th>Condition</th></tr>'; // Reset table headers

    const rowsPerPage = 10; // Display 10 rows per page
    let currentPage = 1;

    // Function to render the table for a specific page
    function renderTable(page) {
        table.innerHTML = '<tr><th>Date</th><th>Temp (°C)</th><th>Condition</th></tr>'; // Reset table headers
        const start = (page - 1) * rowsPerPage;
        const end = start + rowsPerPage;

        // Display the forecast data for the current page
        data.slice(start, end).forEach(item => {
            const row = table.insertRow();
            row.insertCell(0).textContent = item.date;
            row.insertCell(1).textContent = item.temp;
            row.insertCell(2).textContent = item.condition;
        });

        updatePagination(page);
    }

    // Function to update pagination controls
    function updatePagination(page) {
        const totalPages = Math.ceil(data.length / rowsPerPage);
        const pagination = document.getElementById('pagination');
        pagination.innerHTML = ''; // Clear previous pagination buttons

        for (let i = 1; i <= totalPages; i++) {
            const button = document.createElement('button');
            button.textContent = i;
            button.className = 'btn btn-primary btn-sm';
            if (i === page) button.disabled = true; // Disable the button for the current page
            button.addEventListener('click', () => renderTable(i));
            pagination.appendChild(button);
        }
    }

    renderTable(currentPage); // Render the table for the first page initially
}

// Function to Update the Charts (Bar, Doughnut, Line)
function updateCharts(forecastData) {
    const temps = forecastData.slice(0, 5).map(item => item.temp); // Get first 5 temperature data points
    const labels = forecastData.slice(0, 5).map(item => item.date); // Get first 5 dates
    const weatherCounts = getWeatherCounts(forecastData); // Get counts of different weather conditions

    renderBarChart(labels, temps);       // Render Bar Chart with Temperature data
    renderDoughnutChart(weatherCounts);  // Render Doughnut Chart with Weather Counts
    renderLineChart(labels, temps);      // Render Line Chart with Temperature data
}

// Get Weather Counts for the Doughnut Chart
// Get Weather Counts for the Doughnut Chart (Refined)
function getWeatherCounts(data) {
    const counts = {
        Rain: 0,
        Clouds: 0,
        Clear: 0
    };

    data.forEach(item => {
        const condition = item.condition.toLowerCase(); // Lowercase for easier matching

        // Categorize based on the weather condition description
        if (condition.includes('rain')) {
            counts.Rain += 1;
        } else if (condition.includes('cloud')) {
            counts.Clouds += 1;
        } else if (condition.includes('clear')) {
            counts.Clear += 1;
        }
    });

    console.log('Weather Counts for Doughnut Chart:', counts); // Debugging output
    return counts;
}


// Function to Render Bar Chart
function renderBarChart(labels, data) {
    if (barChartInstance) barChartInstance.destroy(); // Destroy existing instance if any

    barChartInstance = new Chart(document.getElementById('barChart'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Temperature (°C)',
                data: data,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            animation: {
                delay: function(context) {
                    return context.dataIndex * 300; // Delays each bar by 300ms
                },
                duration: 1000 // Duration of the animation for each bar
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}


// Function to Render Doughnut Chart
function renderDoughnutChart(data) {
    if (doughnutChartInstance) doughnutChartInstance.destroy(); // Destroy existing instance if any

    // Check if data contains any valid values
    console.log('Doughnut Chart Data:', data); // Debugging output

    const filteredData = {
        'Rain': data.Rain || 0,
        'Clouds': data.Clouds || 0,
        'Clear': data.Clear || 0
    };

    doughnutChartInstance = new Chart(document.getElementById('doughnutChart'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(filteredData),
            datasets: [{
                data: Object.values(filteredData),
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'], // Colors for Rain, Clouds, Clear
            }]
        },
        options: {
            animation: {
                delay: function(context) {
                    return context.dataIndex * 300; // Delays each segment by 300ms
                },
                duration: 1000 // Duration of the animation
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(2);
                            return `${label}: ${percentage}%`;
                        }
                    }
                }
            }
        }
    });
}


// Function to Render Line Chart
function renderLineChart(labels, data) {
    if (lineChartInstance) lineChartInstance.destroy(); // Destroy existing instance if any
    
    lineChartInstance = new Chart(document.getElementById('lineChart'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Temperature (°C)',
                data: data,
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                fill: false
            }]
        },
        options: {
            animation: {
                duration: 1000, // Duration of the animation
                easing: 'easeOutBounce', // Gives the "drop" effect
                animateScale: true,
                animateRotate: true
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Parsing Forecast Data for Table and Charts
function getHourlyForecast(data) {
    return data.map(item => ({
        date: item.dt_txt,         // Get full date and time
        temp: item.main.temp,      // Get temperature
        condition: item.weather[0].description // Get weather condition
    }));
}

// Attach event listeners to search and fetch weather data
document.getElementById('get-weather').addEventListener('click', () => {
    const city = document.getElementById('city-input').value;
    const lat = document.getElementById('lat-input').value;
    const lon = document.getElementById('lon-input').value;

    if (lat && lon) {
        fetchForecastData(null, lat, lon);
    } else if (city) {
        fetchForecastData(city);
    } else {
        alert('Please enter a city or latitude/longitude coordinates');
    }
});



// Chatbot Logic
const geminiApiKey = 'AIzaSyDHTvpJmPq-W2ZJyOiC3diY1lS8HxW94RE'; 

function isWeatherQuery(input) {
    return input.toLowerCase().includes('weather');
}

async function fetchGeminiResponse(query) {
    const url = `https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generateText?key=${geminiApiKey}`;
    const body = JSON.stringify({
        prompt: { text: query },
    });

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body,
        });
        const data = await response.json();
        return data.candidates[0].output;
    } catch (error) {
        console.error('Gemini API Error:', error);
        return "Sorry, I can answer only weather related questions.";
    }
}

document.getElementById('chat-input').addEventListener('keypress', async (event) => {
    if (event.key === 'Enter') {
        const userInput = event.target.value.trim();
        let botResponse = '';

        if (isWeatherQuery(userInput)) {
            const match = userInput.match(/weather in (\w+)/i);
            if (match) {
                const city = match[1]; 
                const weatherData = await fetchWeatherData(city);
                
                if (weatherData) {
                    botResponse = `The weather in ${city} is ${weatherData.weather[0].description} with a temperature of ${weatherData.main.temp}°C.`;
                    const forecastData = await fetchForecastData(city);
                    if (forecastData) {
                        botResponse += ' The forecast data has been updated in the tables section.';
                    }
                } else {
                    botResponse = 'City or coordinates not found.';
                }
            } else {
                botResponse = 'Please specify a city in your weather query.';
            }
        } else {
            botResponse = await fetchGeminiResponse(userInput);
        }

        document.getElementById('chat-output').innerHTML += `<div class="user-message">${userInput}</div>`;
        document.getElementById('chat-output').innerHTML += `<div class="bot-message">${botResponse}</div>`;
        event.target.value = '';  
    }
});
