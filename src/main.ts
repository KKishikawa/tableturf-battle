import '@fortawesome/fontawesome-free/css/all.css';
import '@/styles/style.pcss';
import '@/global';
import '@/core';
import '@/start';

import App from './App.svelte'

const app = new App({
  target: document.getElementById('app')!,
})

export default app
