// Configuración básica
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('tooltip');
const charges = [];
const k = 8.99e5; // Constante de Coulomb simplificada

// Elementos de la interfaz
const fullscreenBtn = document.getElementById('fullscreenBtn');
const simulatorCard = document.querySelector('.simulator-card');

// Obtener tipo de grafico a realizar
const plotTypeSelect = document.getElementById('plotType');
plotTypeSelect.addEventListener('change', draw);

// Ajustar tamaño del canvas
function resizeCanvas() {
  const container = canvas.parentElement;
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  draw();
}

// Inicializar el canvas
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Controles
const chargeValueInput = document.getElementById('chargeValue');
const chargeValueDisplay = document.getElementById('chargeValueDisplay');
const clearBtn = document.getElementById('clearBtn');

// Configurar eventos de los controles
chargeValueInput.addEventListener('input', function() {
  chargeValueDisplay.textContent = this.value + ' µC';
});

clearBtn.addEventListener('click', function() {
  charges.length = 0;
  draw();
});

// Pantalla completa
fullscreenBtn.addEventListener('click', function() {
  if (!document.fullscreenElement) {
    simulatorCard.requestFullscreen().catch(err => {
      console.error(`Error al intentar pantalla completa: ${err.message}`);
    });
  } else {
    document.exitFullscreen();
  }
});

document.addEventListener('fullscreenchange', function() {
  if (document.fullscreenElement) {
    simulatorCard.classList.add('fullscreen-mode');
  } else {
    simulatorCard.classList.remove('fullscreen-mode');
  }
  resizeCanvas();
});

// Interacción con el canvas
canvas.addEventListener('click', function(e) {
  if (e.button === 0) { // Solo clic izquierdo
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const q = parseInt(document.getElementById('chargeType').value) * parseInt(chargeValueInput.value);
    
    charges.push({x, y, q});
    draw();
  }
});

canvas.addEventListener('contextmenu', function(e) {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Buscar carga para eliminar
  for (let i = charges.length - 1; i >= 0; i--) {
    const charge = charges[i];
    const dx = x - charge.x;
    const dy = y - charge.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 15) {
      charges.splice(i, 1);
      draw();
      return;
    }
  }
});

canvas.addEventListener('mousemove', function(e) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Calcular campo eléctrico en esta posición
  let Ex = 0, Ey = 0;
  for (const charge of charges) {
    const dx = x - charge.x;
    const dy = y - charge.y;
    const r2 = dx * dx + dy * dy;
    if (r2 < 25) continue; // evitar división por cero
    
    const r = Math.sqrt(r2);
    const E = k * charge.q / r2;
    Ex += E * (dx / r);
    Ey += E * (dy / r);
  }
  
  const fieldStrength = Math.sqrt(Ex * Ex + Ey * Ey);
  tooltip.textContent = `Campo: ${fieldStrength.toExponential(2)} N/C`;
  tooltip.style.display = 'block';
  tooltip.style.left = `${x + 15}px`;
  tooltip.style.top = `${y + 15}px`;
});

canvas.addEventListener('mouseleave', function() {
  tooltip.style.display = 'none';
});

// Funciones de dibujo
function drawFieldVectors() {
  const step = 30;
  
  for (let x = step/2; x < canvas.width; x += step) {
    for (let y = step/2; y < canvas.height; y += step) {
      let Ex = 0, Ey = 0;
      
      for (const charge of charges) {
        const dx = x - charge.x;
        const dy = y - charge.y;
        const r2 = dx * dx + dy * dy;
        if (r2 < 25) continue;
        
        const r = Math.sqrt(r2);
        const E = k * charge.q / r2;
        Ex += E * (dx / r);
        Ey += E * (dy / r);
      }
      
      const len = Math.sqrt(Ex * Ex + Ey * Ey);
      if (len > 0) {
        // Color basado en intensidad
        const hue = 200 * (1 - Math.min(1, len / 10000));
        ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
        drawArrow(x, y, x + Ex / len * 15, y + Ey / len * 15);
      }
    }
  }
}

function drawFieldLines() {
  const numLines = 12;
  const steps = 500;
  const stepSize = 5;
  
  for (const charge of charges) {
    for (let i = 0; i < numLines; i++) {
      const angle = (i / numLines) * 2 * Math.PI;
      let x = charge.x + Math.cos(angle) * 20;
      let y = charge.y + Math.sin(angle) * 20;
      
      ctx.beginPath();
      ctx.moveTo(x, y);
      
      for (let j = 0; j < steps; j++) {
        let Ex = 0, Ey = 0;
        
        for (const otherCharge of charges) {
          const dx = x - otherCharge.x;
          const dy = y - otherCharge.y;
          const r2 = dx * dx + dy * dy;
          if (r2 < 25) continue;
          
          const r = Math.sqrt(r2);
          const E = k * otherCharge.q / r2;
          Ex += E * (dx / r);
          Ey += E * (dy / r);
        }
        
        const len = Math.sqrt(Ex * Ex + Ey * Ey);
        if (len === 0) break;
        
        // Dirección depende del signo de la carga
        const dir = charge.q > 0 ? 1 : -1;
        x += dir * Ex / len * stepSize;
        y += dir * Ey / len * stepSize;
        
        // Verificar si salió del canvas
        if (x < 0 || x > canvas.width || y < 0 || y > canvas.height) break;
        
        // Verificar si se acerca a otra carga
        let nearCharge = false;
        for (const otherCharge of charges) {
          if (otherCharge === charge) continue;
          const dx = x - otherCharge.x;
          const dy = y - otherCharge.y;
          if (dx * dx + dy * dy < 400) {
            nearCharge = true;
            break;
          }
        }
        if (nearCharge) break;
        
        ctx.lineTo(x, y);
      }
      
      ctx.strokeStyle = charge.q > 0 ? 'rgba(247, 37, 133, 1)' : 'rgba(76, 100, 240, 1)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

function drawCharges() {
  // Eliminar etiquetas antiguas
  document.querySelectorAll('.charge-value').forEach(el => el.remove());
  
  for (const charge of charges) {
    // Dibujar carga
    ctx.beginPath();
    ctx.arc(charge.x, charge.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = charge.q > 0 ? '#d11424' : '#4361ee';
    ctx.fill();
    
    // Borde de la carga
    ctx.lineWidth = 2;
    ctx.strokeStyle = charge.q > 0 ? '#d11473' : '#3a0ca3';
    ctx.stroke();
    
    // Símbolo de la carga
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(charge.q > 0 ? '+' : '-', charge.x, charge.y);
    
    // Añadir etiqueta con valor
    const label = document.createElement('div');
    label.className = 'charge-value';
    label.textContent = `${Math.abs(charge.q)} µC`;
    label.style.left = `${charge.x + 15}px`;
    label.style.top = `${charge.y - 15}px`;
    label.style.color = charge.q > 0 ? '#f72585' : '#4361ee';
    document.querySelector('.simulation-area').appendChild(label);
  }
}

function drawArrow(x1, y1, x2, y2) {
  const headlen = 6;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const selectedOption = plotTypeSelect.value;

  if (selectedOption === 'vector') {
    drawFieldVectors();
  } else if (selectedOption === 'lines') {
    drawFieldLines();
  } else if (selectedOption === 'both') {
    drawFieldVectors();
    drawFieldLines();
  }
  drawCharges();
}

// Iniciar
draw();