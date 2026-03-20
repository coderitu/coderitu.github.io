const display = document.getElementById('display');
const buttons = document.querySelectorAll('.btn');

const themeToggle = document.getElementById('theme-toggle');
const historyToggle = document.getElementById('history-toggle');
const historyContainer = document.getElementById('history-container');
const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history');

// Unit Converter Elements
const unitCategory = document.getElementById('converter-category');
const unitFromValue = document.getElementById('converter-from-value');
const unitFromUnit = document.getElementById('converter-from-unit');
const unitToValue = document.getElementById('converter-to-value');
const unitToUnit = document.getElementById('converter-to-unit');

// Currency Converter Elements
const currFromValue = document.getElementById('currency-from-value');
const currFromUnit = document.getElementById('currency-from-unit');
const currToValue = document.getElementById('currency-to-value');
const currToUnit = document.getElementById('currency-to-unit');
const apiStatus = document.getElementById('api-status');

let history = [];
let currentInput = '0';
let previousInput = '';
let operation = null;
let shouldResetDisplay = false;

// Conversion Rates Dictionary
const units = {
    length: {
        meters: 1,
        kilometers: 0.001,
        centimeters: 100,
        millimeters: 1000,
        miles: 0.000621371,
        yards: 1.09361,
        feet: 3.28084,
        inches: 39.3701
    },
    volume: {
        liters: 1,
        milliliters: 1000,
        gallons: 0.264172,
        quarts: 1.05669,
        pints: 2.11338,
        cups: 4.22675
    },
    mass: {
        kilograms: 1,
        grams: 1000,
        milligrams: 1000000,
        metric_tons: 0.001,
        pounds: 2.20462,
        ounces: 35.274
    }
};

let currencyRates = {}; // Will be populated by API

const defaultMathUnits = {
    length: ['meters', 'feet'],
    volume: ['liters', 'gallons'],
    mass: ['kilograms', 'pounds']
};

function capitalize(str) {
    return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// === UNIT CONVERTER LOGIC === //
function populateUnitCategory(category) {
    const categoryUnits = Object.keys(units[category]);
    
    unitFromUnit.innerHTML = '';
    unitToUnit.innerHTML = '';
    
    categoryUnits.forEach(unit => {
        const option1 = document.createElement('option');
        option1.value = unit;
        option1.innerText = capitalize(unit);
        unitFromUnit.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = unit;
        option2.innerText = capitalize(unit);
        unitToUnit.appendChild(option2);
    });
    
    unitFromUnit.value = defaultMathUnits[category][0];
    unitToUnit.value = defaultMathUnits[category][1];
    
    calculateUnitConversion();
}

function calculateUnitConversion() {
    const category = unitCategory.value;
    const fromUnit = unitFromUnit.value;
    const toUnit = unitToUnit.value;
    const valueStr = unitFromValue.value;

    if (valueStr === '') {
        unitToValue.value = '';
        return;
    }

    const value = parseFloat(valueStr);
    const rates = units[category];
    const valueInBase = value / rates[fromUnit];
    let result = valueInBase * rates[toUnit];
    
    result = Math.round(result * 100000000) / 100000000;
    unitToValue.value = result;
}

unitCategory.addEventListener('change', (e) => populateUnitCategory(e.target.value));
unitFromValue.addEventListener('input', calculateUnitConversion);
unitFromUnit.addEventListener('change', calculateUnitConversion);
unitToUnit.addEventListener('change', calculateUnitConversion);

// === CURRENCY CONVERTER LOGIC === //
async function fetchCurrencyRates() {
    try {
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        if (!res.ok) throw new Error("Failed to fetch rates");
        const data = await res.json();
        
        currencyRates = data.rates;
        
        apiStatus.innerText = "Rates synced!";
        apiStatus.classList.add("success");
        
        populateCurrencyDropdowns();

    } catch(err) {
        console.warn('Currency Fetch Error: Using fallback mock rates.', err);
        apiStatus.innerText = "Offline mode - Mock data";
        currencyRates = { USD: 1, EUR: 0.85, GBP: 0.75, JPY: 110, CAD: 1.25, AUD: 1.35 };
        populateCurrencyDropdowns();
    }
}

function populateCurrencyDropdowns() {
    const codes = Object.keys(currencyRates);
    
    currFromUnit.innerHTML = '';
    currToUnit.innerHTML = '';
    
    codes.forEach(code => {
        const option1 = document.createElement('option');
        option1.value = code;
        option1.innerText = code;
        currFromUnit.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = code;
        option2.innerText = code;
        currToUnit.appendChild(option2);
    });

    if(currencyRates['USD']) currFromUnit.value = 'USD';
    if(currencyRates['EUR']) currToUnit.value = 'EUR';
    
    calculateCurrencyConversion();
}

function calculateCurrencyConversion() {
    const fromUnit = currFromUnit.value;
    const toUnit = currToUnit.value;
    const valueStr = currFromValue.value;

    if (valueStr === '' || !currencyRates[fromUnit]) {
        currToValue.value = '';
        return;
    }

    const value = parseFloat(valueStr);
    
    // API provides everything relative to USD base
    const valueInUSD = value / currencyRates[fromUnit];
    let result = valueInUSD * currencyRates[toUnit];
    
    // Format to 2 decimal places for standard currency look
    result = result.toFixed(2);
    currToValue.value = result;
}

currFromValue.addEventListener('input', calculateCurrencyConversion);
currFromUnit.addEventListener('change', calculateCurrencyConversion);
currToUnit.addEventListener('change', calculateCurrencyConversion);

// Initialize App Panels
populateUnitCategory('length');
fetchCurrencyRates();


// === CALCULATOR LOGIC === //
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
});

historyToggle.addEventListener('click', () => {
    historyToggle.classList.toggle('active');
    historyContainer.classList.toggle('show');
});

clearHistoryBtn.addEventListener('click', () => {
    history = [];
    renderHistory();
});

function updateDisplay() {
    if (currentInput.toString().length > 12) {
        const num = parseFloat(currentInput);
        if(!isNaN(num)) display.innerText = num.toExponential(5);
        else display.innerText = currentInput;
    } else {
        display.innerText = currentInput;
    }
}

function clear() {
    currentInput = '0';
    previousInput = '';
    operation = null;
}

function deleteNumber() {
    if (currentInput.length === 1 || currentInput === 'Error') {
        currentInput = '0';
    } else {
        currentInput = currentInput.slice(0, -1);
    }
}

function appendNumber(number) {
    if (currentInput === '0' || currentInput === 'Error' || shouldResetDisplay) {
        if(number === 'pi') {
            currentInput = Math.PI.toString().slice(0, 10);
        } else {
            currentInput = number;
        }
        shouldResetDisplay = false;
    } else {
        if(number === 'pi') return; 
        if (number === '.' && currentInput.includes('.')) return;
        currentInput += number;
    }
}

function chooseOperation(op) {
    if (currentInput === '' || currentInput === 'Error') return;
    if (previousInput !== '') {
        compute();
    }
    operation = op;
    previousInput = currentInput;
    shouldResetDisplay = true;
}

function compute() {
    let computation;
    const prev = parseFloat(previousInput);
    const current = parseFloat(currentInput);
    
    if (isNaN(prev) || isNaN(current)) return;

    switch (operation) {
        case 'add':
            computation = prev + current;
            break;
        case 'subtract':
            computation = prev - current;
            break;
        case 'multiply':
            computation = prev * current;
            break;
        case 'divide':
            if (current === 0) {
                currentInput = "Error";
                operation = null;
                previousInput = '';
                updateDisplay();
                return;
            }
            computation = prev / current;
            break;
        case 'power':
            computation = Math.pow(prev, current);
            break;
        default:
            return;
    }

    const result = Math.round(computation * 100000000) / 100000000;
    addToHistory(prev, current, operation, result);
    
    currentInput = result.toString();
    operation = null;
    previousInput = '';
    shouldResetDisplay = true;
}

function applyImmediateOperation(action) {
    const current = parseFloat(currentInput);
    if (isNaN(current) || currentInput === 'Error') return;
    
    let result;
    const degreesToRadians = Math.PI / 180;
    
    switch(action) {
        case 'sin':
            result = Math.sin(current * degreesToRadians);
            break;
        case 'cos':
            result = Math.cos(current * degreesToRadians);
            break;
        case 'tan':
            if (current % 180 === 90) { 
                currentInput = 'Error';
                updateDisplay();
                return;
            }
            result = Math.tan(current * degreesToRadians);
            break;
        case 'log':
            if (current <= 0) {
               currentInput = 'Error';
               updateDisplay();
               return;
            }
            result = Math.log10(current);
            break;
        case 'ln':
            if (current <= 0) {
               currentInput = 'Error';
               updateDisplay();
               return;
            }
            result = Math.log(current);
            break;
        case 'sqrt':
            if (current < 0) {
               currentInput = 'Error';
               updateDisplay();
               return;
            }
            result = Math.sqrt(current);
            break;
    }
    
    result = Math.round(result * 100000000) / 100000000; 
    addToHistory('', current, action, result);
    
    currentInput = result.toString();
    shouldResetDisplay = true;
    updateDisplay();
}

function applyPercent() {
    const current = parseFloat(currentInput);
    if (isNaN(current)) return;
    currentInput = (current / 100).toString();
}

function getOperatorSymbol(op) {
    switch (op) {
        case 'add': return '+';
        case 'subtract': return '-';
        case 'multiply': return '×';
        case 'divide': return '÷';
        case 'power': return '^';
        default: return '';
    }
}

function addToHistory(prev, curr, op, result) {
    history.push({ prev, curr, operation: op, result });
    if (history.length > 20) history.shift();
    renderHistory();
}

function renderHistory() {
    if (history.length === 0) {
        historyList.innerHTML = '<div class="empty-history">No history yet</div>';
        return;
    }
    
    historyList.innerHTML = '';
    const reversedHistory = [...history].reverse();
    
    reversedHistory.forEach((item) => {
        const historyItem = document.createElement('div');
        historyItem.classList.add('history-item');
        
        if (item.prev === '') {
             historyItem.innerHTML = `
                <div class="history-equation">${item.operation}(${item.curr}) =</div>
                <div class="history-result">${item.result}</div>
            `;
        } else {
            const operatorSymbol = getOperatorSymbol(item.operation);
            historyItem.innerHTML = `
                <div class="history-equation">${item.prev} ${operatorSymbol} ${item.curr} =</div>
                <div class="history-result">${item.result}</div>
            `;
        }
        
        historyItem.addEventListener('click', () => {
            currentInput = item.result.toString();
            previousInput = '';
            operation = null;
            shouldResetDisplay = true;
            updateDisplay();
            
            // Close history panel after selection if we are viewing it
            historyContainer.classList.remove('show');
            historyToggle.classList.remove('active');
        });
        
        historyList.appendChild(historyItem);
    });
}

buttons.forEach(button => {
    button.addEventListener('click', () => {
        button.classList.remove('btn-animate');
        void button.offsetWidth;
        button.classList.add('btn-animate');

        if (button.dataset.number) {
            appendNumber(button.dataset.number);
            updateDisplay();
        } else if (button.dataset.action) {
            const action = button.dataset.action;
            switch(action) {
                case 'clear': clear(); updateDisplay(); break;
                case 'delete': deleteNumber(); updateDisplay(); break;
                case 'percent': applyPercent(); updateDisplay(); break;
                case 'calculate': compute(); updateDisplay(); break;
                case 'sin':
                case 'cos':
                case 'tan':
                case 'log':
                case 'ln':
                case 'sqrt':
                    applyImmediateOperation(action); break;
                default:
                    chooseOperation(action); break;
            }
        }
    });
});

document.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') {
        return; 
    }

    if (e.key >= '0' && e.key <= '9' || e.key === '.') {
        appendNumber(e.key);
        updateDisplay();
    }
    if (e.key === '=' || e.key === 'Enter') {
        e.preventDefault();
        compute();
        updateDisplay();
    }
    if (e.key === 'Backspace') {
        deleteNumber();
        updateDisplay();
    }
    if (e.key === 'Escape') {
        clear();
        updateDisplay();
    }
    if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/' || e.key === '^') {
        const opMap = { '+': 'add', '-': 'subtract', '*': 'multiply', '/': 'divide', '^': 'power' };
        chooseOperation(opMap[e.key]);
    }
});
