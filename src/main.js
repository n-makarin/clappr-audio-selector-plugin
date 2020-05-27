import {Events, Styler, UICorePlugin, template} from 'clappr'
import pluginHtml from './public/level-selector.html'
import pluginStyle from './public/style.scss'

const AUTO = -1

export default class LevelSelector extends UICorePlugin {

  static get version() { return VERSION }

  get name() { return 'audio_selector' }
  get template() { return template(pluginHtml) }

  get attributes() {
    return {
      'class': this.name,
      'data-audio-selector': ''
    }
  }

  get events() {
    return {
      'click [data-audio-selector-select]': 'onTrackSelect',
      'click [data-audio-selector-button]': 'onButtonClick'
    }
  }

  bindEvents() {
    this.listenTo(this.core, Events.CORE_READY, this.bindPlaybackEvents)
    this.listenTo(this.core.mediaControl, Events.MEDIACONTROL_CONTAINERCHANGED, this.reload)
    this.listenTo(this.core.mediaControl, Events.MEDIACONTROL_RENDERED, this.render)
    this.listenTo(this.core.mediaControl, Events.MEDIACONTROL_HIDE, this.hideContextMenu)
  }

  unBindEvents() {
    this.stopListening(this.core, Events.CORE_READY)
    this.stopListening(this.core.mediaControl, Events.MEDIACONTROL_CONTAINERCHANGED)
    this.stopListening(this.core.mediaControl, Events.MEDIACONTROL_RENDERED)
    this.stopListening(this.core.mediaControl, Events.MEDIACONTROL_HIDE)
    this.stopListening(this.core.getCurrentPlayback(), Events.PLAYBACK_LEVELS_AVAILABLE)
    this.stopListening(this.core.getCurrentPlayback(), Events.PLAYBACK_LEVEL_SWITCH_START)
    this.stopListening(this.core.getCurrentPlayback(), Events.PLAYBACK_LEVEL_SWITCH_END)
    this.stopListening(this.core.getCurrentPlayback(), Events.PLAYBACK_BITRATE)
  }

  bindPlaybackEvents() {
    var currentPlayback = this.core.getCurrentPlayback()
    this.listenTo(currentPlayback, Events.PLAYBACK_PLAY, this.onPlay)
  }

  reload() {
    this.unBindEvents()
    this.bindEvents()
    this.bindPlaybackEvents()
  }

  shouldRender() {
    if (!this.core.getCurrentContainer()) return false

    var currentPlayback = this.core.getCurrentPlayback()
    if (!currentPlayback) return false

    var hls = currentPlayback._hls
    if (!hls) return false

    // Only care if we have at least 2 to choose from
    var hasMultipleTracks = !!(this.tracks && this.tracks.length > 1)

    return hasMultipleTracks
  }

  render() {
    if (this.shouldRender()) {
      var style = Styler.getStyleFor(pluginStyle, {baseUrl: this.core.options.baseUrl})

      this.$el.html(this.template({ 
        'tracks': this.tracks, 
        'title': this.getTitle()
      }))
      this.$el.append(style)
      this.core.mediaControl.$('.media-control-right-panel').append(this.el)
      this.highlightCurrentTrack()
    }
    return this
  }

  onPlay() {
    this.fillTracks();
    this.render();
  }

  fillTracks() {
    var hls = this.core.getCurrentPlayback()._hls
    if (hls) {
      this.tracks = hls.audioTracks; 
      this.setCurrentTrack();
      this.setDefaultTrack();
    }
  }

  onTrackSelect(event) {
    var hls = this.core.getCurrentPlayback()._hls
    if (!hls) return

    this.current = parseInt(event.target.dataset.audioSelectorSelect, 10)
    hls.audioTrack = this.current

    this.toggleContextMenu()
    this.highlightCurrentTrack()

    event.stopPropagation()
    return false
  }

  onButtonClick(event) { this.toggleContextMenu() }

  hideContextMenu() { this.$('.audio_selector ul').hide() }

  toggleContextMenu() { this.$('.audio_selector ul').toggle() }

  buttonElement() { return this.$('.audio_selector button') }

  trackElement(id) { return this.$('.audio_selector ul a'+(!isNaN(id) ? '[data-audio-selector-select="'+id+'"]' : '')).parent() }

  getTitle() { return (this.core.options.audioSelectorConfig || {}).title }

  /**
   * @returns void
   */
  updateText() {
    if (this.current !== null && this.tracks[this.current]) {
      this.buttonElement().text(this.tracks[this.current].name);
    }
  }

  /**
   * @returns void
   */
  highlightCurrentTrack() {
    this.trackElement().removeClass('current')
    this.current && this.trackElement(this.current).addClass('current')
    this.updateText()
  }

  /**
   * @returns void
   */
  setCurrentTrack() {
    this.current = this.getDefaultTrackIndex() || 0;
  }

  /**
   * @returns void
   */
  setDefaultTrack() {
    this.core.getCurrentPlayback()._hls.audioTrack = this.current; 
  }

  /**
   * @returns number
   */
  getDefaultTrackIndex() {
    var index = 0;
    for (var i = 0; i < this.tracks.length; i++) {
      if (this.isPositiveDefaultValue(this.tracks[i])) { 
        index = i
        break;
      }
    }
    return index;
  }

  /**
   * @param {string} name 
   * @returns string
   */
  getDefaultValueByTrackName(name) {
    if (!name) { 
      return ''; 
    }
    var defaultPropName = 'default=';
    if (!name.toLowerCase().includes(defaultPropName)) {
      return '';
    }
    var indexStart = name.search(defaultPropName);
    var indexEnd = indexStart + defaultPropName.length;
    return name.slice(indexStart, indexEnd);
  }

  /**
   * @param {object} track 
   * @returns boolean
   */
  isPositiveDefaultValue(track) {
    if (!track) {
      return false;
    }
    var value;
    if (typeof track.default === "boolean") {
      value = track.default;
    }
    if (typeof track.default === "string") {
      value = track.default.toLowerCase() === 'yes';
    }
    if (!value) {
      var defaultValue = this.getDefaultValueByTrackName(track.name);
      value = defaultValue.toLowerCase() === 'yes';
    }
    return value;
  }
}
