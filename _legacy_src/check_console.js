const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  // Limpiar localStorage y recargar para forzar la toma de hardcoded DB
  await page.evaluate(() => {
     localStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle0' });
  
  // Extraer información del DOM renderizado
  const htmlContent = await page.evaluate(() => {
      return {
          servicesCount: document.querySelectorAll('.service-card').length,
          calendarExists: !!document.querySelector('.fc'),
          servicesHTML: document.getElementById('step1Services')?.innerHTML
      };
  });
  
  console.log('TARJETAS DE SERVICIOS ENCONTRADAS:', htmlContent.servicesCount);
  console.log('CALENDARIO RENDERIZADO:', htmlContent.calendarExists);
  console.log('HTML de step1Services length:', htmlContent.servicesHTML?.length);
  
  await browser.close();
})();
