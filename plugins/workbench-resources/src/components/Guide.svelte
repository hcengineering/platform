<script>
  
let elements = [];
let currentIndex = 0;
let subElements = new Map();
let subElementActive = false;
let currentSubElements = [];
let overlayJustifyContent = 'flex-start';
let lastButtonPressTime = 0;
let showPopup = true;
let guideFinished = false;



let elementsData = {
  0: {
    name: 'Workspace',
    id: 0,
    text: 'Text 1',
    subText: []
  },
  1: {
    name: 'Workspace',
    id: 1,
    text: 'Text 2',
    subText: []
  },
  2: {
    name: 'inbox',
    id: 2,
    text: 'Text 3',
    subText: [
      { selector: '.ac-header > div:nth-child(2)', text: 'subText 1' },
      { selector: '.tablist-container', text: 'subText 2' },
      { selector: '.antiPanel-wrap__content > div:nth-child(3)', text: 'subText 3' }
    ]
  },
  3: {
    name: 'planner',
    id: 3,
    text: 'Text 4',
    subText: [
      { selector: '.antiPanel-wrap__content > div:nth-child(2)', text: 'subText 1' },
      { selector: '.toDos-container > div:nth-child(3)', text: 'subText 2' },
      { selector: '.hulyComponent', text: 'subText 3' }
    ]
  },
  4: {
    name: 'contacts',
    id: 4,
    text: 'Text 4',
    subText: [
      { selector: '.antiPanel-wrap__content > div:nth-child(2)', text: 'subText 1' },
      { selector: '.antiPanel-component > div:nth-child(1)', text: 'subText 2' },
      { selector: '.antiPanel-component > div:nth-child(2)', text: 'subText 3' },
      { selector: '.metaColumn', text: 'subText 4' }
    ]
  },
  5: {
    name: 'chat',
    id: 5,
    text: 'Text 4',
    subText: [
      { selector: '.hulyNavPanel-container', text: 'subText 1' },
      { selector: '.filled', text: 'subText 2' }
    ]
  },
  6: {
    name: 'recruiting',
    id: 6,
    text: 'Text 4',
    subText: [
      { selector: '.antiPanel-wrap__content', text: 'subText 1' },
      { selector: '.antiComponent > div:nth-child(1)', text: 'subText 2' },
      { selector: '.antiComponent > div:nth-child(2)', text: 'subText 3' },
      { selector: '.antiComponent > div:nth-child(3)', text: 'subText 4' }
    ]
  },
  7: {
    name: 'leads',
    id: 7,
    text: 'Text 4',
    subText: [
      { selector: '.antiPanel-navigator', text: 'subText 1' },
      { selector: '.antiComponent', text: 'subText 2' }
    ]
  },
  8: {
    name: 'inventory',
    id: 8,
    text: 'Text 4',
    subText: [
      { selector: '.antiPanel-wrap__content > div:nth-child(2)', text: 'subText 1' },
      { selector: '.antiComponent > div:nth-child(1)', text: 'subText 2' },
      { selector: '.antiComponent > div:nth-child(2)', text: 'subText 3' },
      { selector: '.antiComponent > div:nth-child(3)', text: 'subText 4' }
    ]
  },
  9: {
    name: 'Human resources',
    id: 9,
    text: 'Text 4',
    subText: [
      { selector: '.antiPanel-navigator', text: 'subText 1' },
      { selector: '.filled  > div:nth-child(1)', text: 'subText 2' },
      { selector: '.filled > div:nth-child(2)', text: 'subText 3' },
      { selector: '.filled > div:nth-child(3)', text: 'subText 4' },
      { selector: '.filled  > div:nth-child(4)', text: 'subText 4' }
    ]
  },
  10: {
    name: 'tracker',
    id: 10,
    text: 'Text 4',
    subText: [
      { selector: '.antiPanel-navigator > .antiPanel-wrap__content', text: 'subText 1' },
      { selector: '.antiComponent > div:nth-child(1)', text: 'subText 2' },
      { selector: '.antiComponent > div:nth-child(2)', text: 'subText 3' }
    ]
  },
  11: {
    name: 'documents',
    id: 11,
    text: 'Text 4',
    subText: [
      { selector: '.antiPanel-navigator > .antiPanel-wrap__content', text: 'subText 1' },
      { selector: '.antiComponent > div:nth-child(1)', text: 'subText 2' },
      { selector: '.antiComponent > div:nth-child(2)', text: 'subText 3' },
      { selector: '.antiComponent > div:nth-child(3)', text: 'subText 4' }
    ]
  },
  12: {
    name: 'board',
    id: 12,
    text: 'Text 4',
    subText: [
      { selector: '.antiPanel-navigator > .antiPanel-wrap__content', text: 'subText 1' },
      { selector: '.antiComponent > div:nth-child(1)', text: 'subText 2' },
      { selector: '.antiComponent > div:nth-child(2)', text: 'subText 3' },
      { selector: '.antiComponent > div:nth-child(3)', text: 'subText 4' }
    ]
  },
  13: {
    name: 'team',
    id: 13,
    text: 'Text 4',
    subText: [
      { selector: '.antiPanel-navigator > .antiPanel-wrap__content', text: 'subText 1' },
      { selector: '.antiPanel-component > div > div:nth-child(3) > div:nth-child(1)', text: 'subText 2' },
      { selector: '.antiPanel-component > div > div:nth-child(3) > div:nth-child(2)', text: 'subText 3' },
      { selector: '.antiPanel-component > div > div:nth-child(3) > div:nth-child(3)', text: 'subText 4' }
    ]
  },  
  14: {
    name: 'drive',
    id: 14,
    text: 'Text 4',
    subText: [
      { selector: '.antiPanel-navigator > .antiPanel-wrap__content', text: 'subText 1' },
      { selector: '.antiPanel-component', text: 'subText 2' }
    ]
  }, 
   14: {
    name: 'devmodal',
    id: 14,
    text: 'Text 4',
    subText: [
      { selector: '.antiPanel-navigator > .antiPanel-wrap__content', text: 'subText 1' },
      { selector: '.antiPanel-component', text: 'subText 2' }
    ]
  },
};

function startGuide() {
    showPopup = false;
    setTimeout(() => {
      elements = Array.from(document.querySelectorAll('.noUnderline.noBold, .topmenu-container, .logo-container'));
      console.log('Elements found:', elements);
      if (elements.length > 0) {
        elements.forEach((element, index) => {
          if (elementsData[index] && elementsData[index].subText) {
            elementsData[index].subText.forEach(subElementData => {
              const subElement = document.querySelector(subElementData.selector);
              if (subElement) {
                subElements.set(subElementData.selector, subElement);
              }
            });
          }
        });
        
        pulseElement(elements[currentIndex], currentIndex);
        if (shouldClick(elements[currentIndex])) {
          elements[currentIndex].click();
          if (subElements.has(elements[currentIndex])) {
            currentSubElements = Array.from(subElements.values());
            handleSubElements(currentSubElements.shift());
          }
        }
      } else {
        console.warn('No elements found with the specified classes');
      }
    }, 500);
  }

  function handleNextButtonClick() {
  const currentTime = Date.now();
  if (currentTime - lastButtonPressTime < 1) {
    return;
  }
  lastButtonPressTime = currentTime;

  if (elements.length > 0) {
    resetElements(elements);
    if (subElementActive && currentSubElements.length > 0) {
      const subElementData = currentSubElements.shift();
      const subElement = document.querySelector(subElementData.selector);
      handleSubElements(subElement, subElementData.text);
    } else {
      subElementActive = false;
      if (currentIndex < elements.length - 1) {
        currentIndex++;
        pulseElement(elements[currentIndex], currentIndex);
        if (shouldClick(elements[currentIndex])) {
          elements[currentIndex].click();
          if (elementsData[currentIndex] && elementsData[currentIndex].subText.length > 0) {
            setTimeout(() => {
              currentSubElements = elementsData[currentIndex].subText;
              if (currentSubElements.length > 0) {
                subElementActive = true;
              }
            }, 500);
          }
        }
      } else {
        guideFinished = true;
      }
    }
  } else {
    console.warn('No elements in the list');
  }
}

function handleSubElements(subElement, subElementText) {
  pulseElement(subElement, currentIndex, true, subElementText);
  subElement.click();
  console.log('Adding subElement to subElements', subElement);
  subElements.set(subElement, subElement);

  const rect = subElement.getBoundingClientRect();
  const isOnLeftSide = (rect.left + rect.width / 2) < window.innerWidth / 2;

  overlayJustifyContent = isOnLeftSide ? 'flex-end' : 'flex-start';
}

function pulseElement(element, index, isSubElement = false, subElementText = '') {
  if (isSubElement) {
    element.classList.add('subElement');
  } else {
    element.classList.add('element', 'pulsate');
  }

  const infoDiv = document.createElement('div');
  infoDiv.classList.add('infoDiv');

  if (elementsData[index]) {
    if (isSubElement) {
      infoDiv.textContent = subElementText ? subElementText : 'Default sub text';
    } else {
      infoDiv.textContent = elementsData[index].text || 'Default text';
    }
  } else {
    infoDiv.textContent = 'Default text';
  }

  const rect = element.getBoundingClientRect();
  document.body.appendChild(infoDiv);

  const isOnLeftSide = (rect.left + rect.width / 2) < window.innerWidth / 2;

  if (isSubElement) {
    setTimeout(() => {
      if (isOnLeftSide) {
        infoDiv.style.left = `${rect.right + 20}px`;
      } else {
        infoDiv.style.left = `${rect.left - infoDiv.offsetWidth - 20}px`;
      }
      infoDiv.style.top = `${rect.top}px`
    }, 0);
  } else {
    infoDiv.style.left = `${rect.left + 50}px`;
    infoDiv.style.top = `${rect.top}px`;
  }

  element.infoDiv = infoDiv;

}



function shouldClick(element) {
  return !(element.matches('.logo-container, .noUnderline.noBold:nth-child(14)'));
}

function resetElements(elements) {
  elements.forEach(element => {
    element.classList.remove('element')
    element.classList.remove('pulsate');
    if (element.infoDiv) {
      document.body.removeChild(element.infoDiv);
      element.infoDiv = null;
    }
  });
  console.log(subElements)
  subElements.forEach((subElement, key) => {
    subElement.classList.remove('subElement')
    if (subElement.infoDiv) {
      document.body.removeChild(subElement.infoDiv);
      subElement.infoDiv = null;
    }
  });
}

function handleEndButtonClick() {
    showPopup = false;
    resetElements(elements);
    const overlayDiv = document.querySelector('.overlay');
    if (overlayDiv && overlayDiv.parentNode) {
      overlayDiv.parentNode.removeChild(overlayDiv);
    }
    currentIndex = 0;
    elements = [];
  }

  </script>
  
  
  <div class="overlay" style="justify-content: {showPopup || guideFinished ? 'center' : overlayJustifyContent};
  Align-items: {showPopup || guideFinished ? 'center' : 'flex-end'}
  ">
    {#if showPopup}
      <div class="popup">
        <p>Хотите ли вы пройти гайд?</p>
        <div class="button_container">
        <button class="button-guide" on:click={startGuide}>Да</button>
        <button class="button-guide" on:click={handleEndButtonClick}>Нет</button>
      </div>
      </div>
    {:else if guideFinished}
      <div class="popup">
        <p>Спасибо, что завершили гайд!</p>
        <div class="button_container">
        <button class="button-guide" on:click={handleEndButtonClick}>Закрыть</button>
      </div>
      </div>
    {:else}
      <div class="button_container">
        <button class="next-button button-guide" on:click={handleNextButtonClick}>Далее</button>
        <!-- <button class="back-button button-guide" on:click={handleBackButtonClick}>Назад</button> -->
        <button class="end-button button-guide" on:click={handleEndButtonClick}>Завершить</button>
      </div>
    {/if}
  </div>
  
  <style lang="scss">
    :global(.button_container) {
      position: relative;
      z-index: 3000;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-direction: row;
      gap: 20px;
    }


  :global(.infoDiv) {
    position: absolute;
    z-index: 1000;
    background-color: transparent;
    border: 2px solid yellow;
    padding: 20px;
    border-radius: 10px;
    color: white;
    font-weight: bold;
    font-size: 16px;
    text-align: center;
    box-shadow: 0 0 10px 2px yellow;
  }

  :global(.subElement) {
    // box-shadow: 0px 0px 10px 2px yellow;
    border: 2px solid yellow !important;
    position: relative;
    z-index: 5000;
    border-radius: 5px;
    box-sizing: border-box;
  }

  :global(.element) {
    box-shadow: 0 0 10px 2px yellow;
    position: relative;
    z-index: 1000;
    border-radius: 5px;

  }


    @keyframes pulsate {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
  
    :global(.pulsate) {
      animation: pulsate 1s infinite;
      box-shadow: 2px solid yellow;
      position: relative;
      z-index: 9999;
      border-radius: 5px;
    }

    .popup {
      font-size: 32px;
      padding: 20px;
      line-height: 1.5;
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
  
    .overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: flex-end;
      justify-content: flex-start;
      padding-bottom: 20px;
      padding-right: 20px;
      padding-left: 80px;
      z-index: 999;
    }
  
    .button-guide {
      position: relative;
      z-index: 1001;
      font-size: 1.2em;
      padding: 10px 20px;
      color: white;
      background-color: var(--global-accent-TextColor);
      border: none;
      border-radius: 5px;
    }
  </style>
  