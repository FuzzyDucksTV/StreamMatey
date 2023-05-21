document.addEventListener("DOMContentLoaded",(function(e){var t={sentiment:{toggle:document.getElementById("sentimentToggle"),sensitivity:document.getElementById("sentimentSensitivity"),showTopScorers:document.getElementById("showTopScorers"),showBottomScorers:document.getElementById("showBottomScorers"),leaderboardDuration:document.getElementById("leaderboardDuration")},toxicity:{toggle:document.getElementById("toxicityToggle"),message:document.getElementById("toxicityMessage"),modNotification:document.getElementById("toxicityModNotification"),selfNotification:document.getElementById("toxicitySelfNotification"),modMessage:document.getElementById("toxicityModMessage"),selfMessage:document.getElementById("toxicitySelfMessage")}},o=document.getElementById("themeToggle");function r(e){var t=document.getElementById("error-message");t.textContent=e,t.style.display="block"}function n(){var e={darkMode:o.checked};for(var n in t)for(var c in e[n]={enabled:t[n].toggle.checked,options:{}},t[n])if("toggle"!==c){var s=t[n][c];"checkbox"===s.type?e[n].options[c]=s.checked:e[n].options[c]=s.value}chrome.storage.sync.set({preferences:e},(function(){chrome.runtime.lastError&&(console.error("Error saving preferences:",chrome.runtime.lastError),r("Error saving preferences: "+chrome.runtime.lastError.message))}))}chrome.storage.sync.get(["preferences"],(function(e){if(chrome.runtime.lastError)return console.error("Error loading preferences:",chrome.runtime.lastError),void r("Error loading preferences: "+chrome.runtime.lastError.message);var n=e.preferences;if(n)for(var c in n.darkMode?(document.body.classList.add("dark"),o.checked=!0):(document.body.classList.remove("dark"),o.checked=!1),n)for(var s in n[c].enabled?t[c].toggle.checked=!0:t[c].toggle.checked=!1,n[c].options){var i=t[c][s];"checkbox"===i.type?i.checked=n[c].options[s]:(i.type,i.value=n[c].options[s])}})),o.addEventListener("change",(function(){o.checked?document.body.classList.add("dark"):document.body.classList.remove("dark"),n()}));var c=document.getElementById("loginButton");for(var s in c.addEventListener("click",(function(){chrome.runtime.sendMessage({type:"initiateOAuth"})})),t)for(var i in t[s].toggle.addEventListener("change",n),t[s])"toggle"!==i&&t[s][i].addEventListener("input",(function(){n()}));chrome.storage.sync.get(["accessToken"],(function(e){if(chrome.runtime.lastError)return console.error("Error loading access token:",chrome.runtime.lastError),void r("Error loading access token: "+chrome.runtime.lastError.message);if(e.accessToken){c.style.display="none";var t=document.createElement("button");t.innerText="Logout",document.getElementById("twitchAuth").appendChild(t),t.addEventListener("click",(function(){chrome.storage.sync.remove("accessToken",(function(){chrome.runtime.lastError?(console.error("Error removing access token:",chrome.runtime.lastError),r("Error removing access token: "+chrome.runtime.lastError.message)):(c.style.display="block",t.remove())}))}))}}))}));