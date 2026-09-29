// Marks JS as available before first paint, so the hero can hold its copy
// back for the reel without a flash. (External file: the CSP forbids inline scripts.)
document.documentElement.classList.add('js')
