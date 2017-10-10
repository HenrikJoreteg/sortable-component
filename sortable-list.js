function loadScript(src) {
  return new Promise(function(resolve, reject) {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

const run = () => {
  console.log('defining custom element')
  customElements.define('sortable-list', class extends HTMLElement {
    constructor () {
      super()
      this._holdingClass = 'holding'
      this._reset()
    }
  
    static get observedAttributes() { 
      return ['holding-class']
    }
  
    get draggingClass () {
      return this._holdingClass;
    }
    set draggingClass (value) {
      this.setAttribute('holding-class', value);
    }
  
    _addListeners () {
      this.addEventListener('mousedown', this._onStart)
      this.addEventListener('touchstart', this._onStart)
      this.addEventListener('mouseleave', this._onLeave)
      this.addEventListener('touchcancel', this._onLeave)
      this.addEventListener('touchend', this._onTouchEnd)
      this.addEventListener('click', this._onClick)
      this.addEventListener('mousemove', this._onMove)
      this.addEventListener('touchmove', this._onMove)
    }
  
    _removeListeners () {
      this.removeEventListener('mousedown', this._onStart)
      this.removeEventListener('touchstart', this._onStart)
      this.removeEventListener('mouseleave', this._onLeave)
      this.removeEventListener('touchcancel', this._onLeave)
      this.removeEventListener('touchend', this._onTouchEnd)
      this.removeEventListener('click', this._onClick)
      this.removeEventListener('mousemove', this._onMove)
      this.removeEventListener('touchmove', this._onMove)
    }
  
    _onMove (e) {
      if (!this._down) return
      if (this._draggedElement) {
        const yDelta = -this._getDelta(e, 'y')
        this._draggedElement.style.transform = `translateY(${yDelta}px)`
        this._reEvaluatePositions(yDelta)
      } else {
        const distance = this._getDistanceMoved(e)
        if (distance > 10) {
          this._reset()
        }
      }
    }
  
    _getPagePosition (e, xy) {
      return (e.touches ? e.touches[0] : e)[`page${xy.toUpperCase()}`]
    }
  
    _getDelta (e, xy) {
      const { startX, startY } = this
      if (!startX || !startY) return 0
      const pagePos = this._getPagePosition
      const selectedValue = xy === 'x' ? startX : startY
      return selectedValue - pagePos(e, xy)
    } 
  
    _getDistanceMoved (e) {
      const { startX, startY } = this
      const pagePos = this._getPagePosition
      const xDelta = Math.abs(this._getDelta(e, 'x'))
      const yDelta = Math.abs(this._getDelta(e, 'y'))
      return Math.sqrt(Math.pow(xDelta, 2) + Math.pow(yDelta, 2))
    }
  
    _getTopChildFromTarget (el) {
      let current = el
      while (current.parentElement !== this) {
        current = current.parentElement
      }
      return current
    }
  
    _onStart (e) {
      this._down = true
      this.startX = this._getPagePosition(e, 'x')
      this.startY = this._getPagePosition(e, 'y')
      if (this._timer) clearTimeout(this._timer)
      this._timer = setTimeout(() => {
        console.log('HOLDING', e.target)
        this._draggedElement = this._getTopChildFromTarget(e.target)
        const children = this._getChildren()
        if (children.length > 1) {
          this._draggedHeight = children[1].offsetTop - children[0].offsetTop
        }
        this._startOrder = children.map(el => el.id)
        this._startPosition = this._startOrder.indexOf(this._draggedElement.id)
        this._draggedElement.classList.add(this._holdingClass)
        this._setUserSelect(false)
        this._freezeChildren(true)
      }, 300)
    }
  
    _reEvaluatePositions (yDelta) {
      const height = this._draggedHeight
      const indexAdjustment = Math.round(yDelta / height)
      const targetIndex = this._startPosition + indexAdjustment
      const newOrder = this._getIds()
      newOrder[targetIndex] = this._draggedElement.id
      this._getChildren().forEach((el, index) => {
        if (index < this._startPosition) {
          if (targetIndex <= index) {
            newOrder[index + 1] = el.id
            el.style.transform = `translateY(${height}px)`
          } else {
            el.style.transform = ''
          }
        }
        if (index > this._startPosition) {
          if (targetIndex >= index) {
            newOrder[index - 1] = el.id
            el.style.transform = `translateY(-${height}px)`
          } else {
            el.style.transform = ''
          }
        }
      })
      this._newOrder = newOrder
      this._orderedChanged = Boolean(indexAdjustment)
    }
  
    _getChildren () {
      return [].slice.call(this.children)
    }
  
    _getIds () {
      return this._getChildren().map(el => el.id)
    }
  
    _freezeChildren (trueOrFalse) {
      this._getChildren().forEach(child => {
        if (trueOrFalse) {
          child.style.position = 'relative'
        } else {
          child.removeAttribute('style')  
        }
      })
    }
  
    _setUserSelect (trueOrFalse) {
      this._getChildren().forEach(child => {child.style.userSelect = trueOrFalse ? '' : 'none'})
    }
  
    _onLeave () {
      console.log('on leave')
      this._reset()
    }
  
    _onTouchEnd () {
      console.log('on end')
      if (!this._draggedElement) {
        this._reset()
      }
    }
  
    _onClick () {
      console.log('on click')
      if (!this._draggedElement || !this._orderedChanged) {
        this._reset()
      } else {
        this._onSorted()
      }
    }
  
    _reset () {
      if (this._draggedElement) {
        this._draggedElement.classList.remove(this._holdingClass)
        this.removeAttribute('style')
        this._freezeChildren(false)
      }
      if (this._timer) {
        clearTimeout(this._timer)
      }
      this._setUserSelect(true)
      this._draggedElement = null
      this._timer = null
      this.startX = null
      this.startY = null
      this._down = false
      this._orderedChanged = false
      this._startPosition = null
      this._startOrder = null
      this._newOrder = null
      this.style.userSelect = ''
    }
  
    _onSorted () {
      const event = new Event('sorted', {
        bubbles: true,
        cancelable: true
      })
      event.data = this._newOrder
      this.dispatchEvent(event)
    }
  
    disconnectedCallback () {
      console.log('disconnected')
      this._removeListeners()
    }
  
    attributeChangedCallback () {
      console.log('attributeChangedCallback', arguments)
    }
  
    adoptedCallback () {
      console.log('adopted')
    }
  
    connectedCallback () {
      console.log('connected')
      this._addListeners()
    }
  })
}

if (!window.customElements) {
  loadScript('https://cdnjs.cloudflare.com/ajax/libs/webcomponentsjs/1.0.12/webcomponents-loader.js')
  window.addEventListener('WebComponentsReady', run)
} else {
  run()
}

