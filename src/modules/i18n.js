let currentLanguage = process.env.LANGUAGE || 'en';

function setLanguage(lang) {
  if (typeof lang === 'string' && lang.length > 0) {
    currentLanguage = lang;
  }
}

function getLanguage() {
  return currentLanguage;
}

function format(template, params = {}) {
  if (typeof template !== 'string') return template;
  return Object.keys(params).reduce((acc, key) => {
    const re = new RegExp(`\\{${key}\\}`, 'g');
    return acc.replace(re, String(params[key]));
  }, template);
}

module.exports = {
  setLanguage,
  getLanguage,
  format,
};
