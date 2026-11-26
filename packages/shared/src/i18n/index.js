import { addResources } from './core.js';
import en from './locales/en/index.js';
import pt from './locales/pt/index.js';
import es from './locales/es/index.js';

addResources({ en, pt, es });

export * from './core.js';
export * from './format.js';
