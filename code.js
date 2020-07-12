var selectedCard = null;

function setSetting(cname, cvalue, exdays) {
    if (typeof(Storage) !== "undefined") {
        if ((exdays && exdays < 1) || !cvalue) {
            localStorage.removeItem(cname);
        } else {
            localStorage.setItem(cname, cvalue);
        }
    } else {
        var expires = "";
        if(exdays){
            var d = new Date();
            d.setTime(d.getTime() + (exdays*24*60*60*1000));
            var expires = "expires="+ d.toUTCString();
        }
        document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
    }
};

function getSetting(cname) {
    if (typeof(Storage) !== "undefined") {
        return localStorage.getItem(cname);
    } else {
        var name = cname + "=";
        var decodedCookie = decodeURIComponent(document.cookie);
        var ca = decodedCookie.split(';');
        for (var i = 0; i <ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
    }
    return "";
};

// this function is to initialize the form with card information
function init() {
    // load settings from cookies
    var darkMode = getSetting("darkmode");
    if (darkMode) {
        document.getElementById("darkmode").checked = true;
        document.body.classList.add("dark-mode");
    }

    var cardSelect = document.forms["inputs"]["card"];
    // card info is loaded from the script tag in the header.
    if(typeof cardInfo === 'undefined' || !cardInfo.length){
        alert("Card info did not load properly");
        return false;
    }

    cardInfo.sort((a,b)=>{
        // sort on names first
        if(a.name < b.name) return -1;
        if(a.name > b.name) return 1;
        // names are equal, sort on rarity
        if(a.rarity < b.rarity) return -1;
        if(a.rarity > b.rarity) return 1;
        // name and rarity are the same
        return 0;
    });

    cardInfo.forEach(function(val,idx,arr){
        var option = document.createElement("option");
        option.value = val.id;
        option.text = val.name + " - " + val.rarity;
        cardSelect.add(option);
    });
};

// this function is to react to user selection changes of the card
function cardChange(select,form) {
    var cardId = select.value;
    var willRebirthCheck = form["rebirth"];
    var maxLvlElement = document.getElementById("rarityMaxLevel");
    if(!cardId || !(Number.isInteger(cardId) && cardId > 0)) {
        selectedCard = null;
        willRebirthCheck.disabled = true;
        willRebirthCheck.checked = false;
        maxLvlElement.textContent = "N/A";
    }
    // find the card in the cardInfo array
    const found = cardInfo.find(c => c.id == cardId);
    if(!found) {
        selectedCard = null;
        willRebirthCheck.disabled = true;
        willRebirthCheck.checked = false;
        maxLvlElement.textContent = "N/A";
        return;
    }
    selectedCard = found;
    if (selectedCard.rebirthCardId) {
        willRebirthCheck.disabled = false;
    } else {
        willRebirthCheck.disabled = true;
    }
    rebirthChange(willRebirthCheck, form);
};

function rebirthChange(checkbox, form) {
    if(!selectedCard) {
        maxLvlElement.textContent = "N/A";
        return;
    }

    var maxLvlElement = document.getElementById("rarityMaxLevel");
    var maxLevelInput = form["maxLevel"];
    var currentLevelInput = form["currentLevel"];
    var currentAtkInput = form["currentAtk"];
    var currentDefInput = form["currentDef"];
    var currentSolInput = form["currentSol"];

    var cardToUseForStats;

    if (!checkbox.disabled && checkbox.checked) {
        cardToUseForStats =
            cardInfo.find(c =>
                            c.id == selectedCard.rebirthCardId
                        ) || selectedCard;
    } else {
        cardToUseForStats = selectedCard;
    }

    
    maxLvlElement.textContent = cardToUseForStats.maxLevel;
    updateLevelLimits(currentLevelInput, maxLevelInput, cardToUseForStats)

    currentAtkInput.min = selectedCard.baseAtk;
    currentAtkInput.max = selectedCard.maxRarityAtk;
    
    currentDefInput.min = selectedCard.baseDef;
    currentDefInput.max = selectedCard.maxRarityDef;
    
    currentSolInput.min = selectedCard.baseSol;
    currentSolInput.max = selectedCard.maxRaritySol;
};

function updateLevelLimits(currentLevelInput, maxLevelInput, card) {
    currentLevelInput.max = Math.min(selectedCard.maxLevel, Number(maxLevelInput.value) || selectedCard.maxLevel);
    maxLevelInput.min = Math.max(Number(currentLevelInput.value) || 0, 1);
    maxLevelInput.max = card.maxLevel;
};

function levelChange(input, form) {
    var cardToUseForStats;
    var checkbox = form["rebirth"];
    if (!checkbox.disabled && checkbox.checked) {
        cardToUseForStats =
            cardInfo.find(c =>
                            c.id == selectedCard.rebirthCardId
                        ) || selectedCard;
    } else {
        cardToUseForStats = selectedCard;
    }

    updateLevelLimits(form["currentLevel"], form["maxLevel"], cardToUseForStats);
}

// this function reacts to any of the values changing in the form
function formChange(form) {
    // comment this if you want to have to hit the "Calculate" button
    calculateArcana(form);
};

function formValid(form) {
    // check if the form is set and has the checkValidity method
    if (!form || !form.checkValidity) return false;
    // actually check the validation
    return form.checkValidity();
};

function calculateArcana(form) {
    if (!formValid(form)) {
        return false;
    }
    // if our card info isn't initialized
    if(!cardInfo || !cardInfo.length){
        alert("Card info is not set. Must be a problem with the `init` method");
    }

    // result locations
    var atkMissing = document.getElementById("atkMissing");
    var atkTarget = document.getElementById("atkTarget");
    var atk50 = document.getElementById("atk50");
    var atk500 = document.getElementById("atk500");
    var atk3000 = document.getElementById("atk3000");

    var defMissing = document.getElementById("defMissing");
    var defTarget = document.getElementById("defTarget");
    var def50 = document.getElementById("def50");
    var def500 = document.getElementById("def500");
    var def3000 = document.getElementById("def3000");

    var soldiersMax = document.getElementById("soldiersMax");
    var soldiersPerfect = document.getElementById("soldiersPerfect");
    var soldiersDifference = document.getElementById("soldiersDifference");

    // values from the form
    var willRebirthCheck = form["rebirth"];
    var willRebirth = !willRebirthCheck.disabled && willRebirthCheck.checked;
    var maxLevel = Number(form["maxLevel"].value);
    var currentLevel = Number(form["currentLevel"].value);
    var levelGain = maxLevel - currentLevel;
    var currentAtk = Number(form["currentAtk"].value);
    var currentDef = Number(form["currentDef"].value);
    var currentSol = Number(form["currentSol"].value);

    // calculated values
    var atkMissingAtMaxLvl;
    var defMissingAtMaxLvl;
    var solAtMaxLvl;
    var solPerfectEvo;

    if (willRebirth) {
        var rebirthCard = cardInfo.find(c => c.id == selectedCard.rebirthCardId);

        var calcStat = function(current, base, max, rbBase, rbMax, rbMaxRarityStat){
            var statGainTotal = rbMax - rbBase;
            var statGainPerLevel = statGainTotal / (rebirthCard.maxLevel - 1);
            var statGainedByLevels = (maxLevel-1) * statGainPerLevel;
            var statRebirthBonus = rbBase - base - Math.round((currentLevel-1) * ((max - base) / (selectedCard.maxLevel - 1)));
            return Math.min(rbMaxRarityStat, current + statRebirthBonus + Math.round(statGainedByLevels));
        };

        atkMissingAtMaxLvl = rebirthCard.maxRarityAtk - calcStat(currentAtk,
                selectedCard.baseAtk, selectedCard.maxAtk,
                rebirthCard.baseAtk, rebirthCard.maxAtk, rebirthCard.maxRarityAtk
        );

        defMissingAtMaxLvl = rebirthCard.maxRarityDef - calcStat(currentDef,
                selectedCard.baseDef, selectedCard.maxDef,
                rebirthCard.baseDef, rebirthCard.maxDef, rebirthCard.maxRarityDef
        );
        
        if (currentSol) {
            solAtMaxLvl = calcStat(currentSol,
                    selectedCard.baseSol, selectedCard.maxSol,
                    rebirthCard.baseSol, rebirthCard.maxSol, rebirthCard.maxRaritySol
            );
        } else {
            solAtMaxLvl = "";
        }
        solPerfectEvo = rebirthCard.perfectSoldierCount;
    } else {
        atkMissingAtMaxLvl = selectedCard.maxRarityAtk - Math.min(selectedCard.maxRarityAtk, currentAtk + Math.round(levelGain * ((selectedCard.maxAtk - selectedCard.baseAtk) / (selectedCard.maxLevel - 1))));
        defMissingAtMaxLvl = selectedCard.maxRarityDef - Math.min(selectedCard.maxRarityDef, currentDef + Math.round(levelGain * ((selectedCard.maxDef - selectedCard.baseDef) / (selectedCard.maxLevel - 1))));
        if (currentSol) {
            solAtMaxLvl = Math.min(selectedCard.maxRaritySol, currentSol + Math.round(levelGain * ((selectedCard.maxSol - selectedCard.baseSol) / (selectedCard.maxLevel - 1))));
        } else {
            solAtMaxLvl = "";
        }
        solPerfectEvo = selectedCard.perfectSoldierCount;
    }
    
    atkMissing.textContent = atkMissingAtMaxLvl;
    atkTarget.textContent = atkMissingAtMaxLvl + currentAtk;
    atk50.textContent = Math.ceil(atkMissingAtMaxLvl / 50);
    atk500.textContent = Math.ceil(atkMissingAtMaxLvl / 500);
    atk3000.textContent = Math.ceil(atkMissingAtMaxLvl / 3000);

    defMissing.textContent = defMissingAtMaxLvl;
    defTarget.textContent = defMissingAtMaxLvl + currentDef;
    def50.textContent = Math.ceil(defMissingAtMaxLvl / 50);
    def500.textContent = Math.ceil(defMissingAtMaxLvl / 500);
    def3000.textContent = Math.ceil(defMissingAtMaxLvl / 3000);

    soldiersMax.textContent = solAtMaxLvl;
    soldiersPerfect.textContent = solPerfectEvo;
    soldiersDifference.textContent = solPerfectEvo - solAtMaxLvl;
};

function modeChange(check, form) {
    if(check.checked) {
        document.body.classList.add("dark-mode");
        setSetting("darkmode", check.checked);
    } else {
        document.body.classList.remove("dark-mode");
        setSetting("darkmode", check.checked, -1);
    }
};
