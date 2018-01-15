define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/topic',
    'dojo/ready'
], function (declare, lang, array, topic, ready) {
    return declare(null, {
        layersWaitForReady: true,
        postCreate: function () {
            this.inherited(arguments);
            if (!this.layerInfos) {
                topic.publish('viewer/handleError', {
                    source: 'AppSettings',
                    error: 'layerInfos are required'
                });
                return;
            }
            this._defaultAppSettings.layerVisibility = {
                save: false,
                value: {},
                checkbox: true,
                label: 'Save Layer Visibility',
                urlLoad: false
            };
        },
        init: function () {
            this.inherited(arguments);
            if (!this._appSettings.layerVisibility) {
                return;
            }
            if (this._appSettings.layerVisibility.save ||
                    this._appSettings.layerVisibility.urlLoad) {
                //needs to be ready so other widgets can update layers
                //accordingly

                if (this.layersWaitForReady) {
                    ready(3, this, '_loadSavedLayers');
                } else {
                    this._loadSavedLayers();
                }
            }
            //needs to come after the loadSavedLayers function
            //so also needs to be ready
            ready(4, this, '_setLayerVisibilityHandles');
        },
        /**
         * sets the visibility of the loaded layers if save or urlLoad is true
         */
        _loadSavedLayers: function () {
            var layers = this._appSettings.layerVisibility.value;
            //load visible layers
            array.forEach(this.layerInfos, lang.hitch(this, function (layer) {
                var layerId = layer.layer.id;
                if (layers.hasOwnProperty(layerId)) {
                    var layerSettings = layers[layerId];
                    var visibleSubLayers = layerSettings.visibleLayers;
                    if (visibleSubLayers &&
                      layer.layer.setAllVisibleLayers) {
                        layer.layer.setAllVisibleLayers(visibleSubLayers);
                    }
                    if (layerSettings.visible !== null) {
                        layer.layer.setVisibility(layerSettings.visible);
                    }
                }
            }));
            //reset url flag
            this._appSettings.layerVisibility.urlLoad = false;
        },
        _setLayerVisibilityHandles: function () {
            var setting = this._appSettings.layerVisibility;
            setting.value = {};
            //since the javascript api visibleLayers property starts
            //with a different set of layers than what is actually turned
            //on, we need to iterate through, find the parent layers,
            array.forEach(this.layerInfos, lang.hitch(this, '_setLayerHandle'));
            this.own(topic.subscribe('layerControl/setAllVisibleLayers', lang.hitch(this, function (layer) {
                setting.value[layer.id].visibleLayers = layer.allVisibleLayers;
                this._saveAppSettings();
            })));
            this.own(topic.subscribe('layerControl/layerToggle', lang.hitch(this, function (layer) {
                setting.value[layer.id].visible = layer.visible;
                this._saveAppSettings();
            })));
            this.own(topic.subscribe('layerControl/addLayerControls', lang.hitch(this, '_handleLayerAdds')));
        },
        _setLayerHandle: function (layer) {
            var setting = this._appSettings.layerVisibility;
            var id = layer.layer.id;
            var visibleLayers;
            if (layer.layer.hasOwnProperty('allVisibleLayers')) {
                visibleLayers = layer.layer.allVisibleLayers;
            }
            setting.value[id] = {
                visible: layer.layer.visible,
                visibleLayers: visibleLayers
            };
        },
        _handleLayerAdds: function (layerInfos) {
            layerInfos.forEach(lang.hitch(this, '_setLayerHandle'));
        },
        getLayerInfo: function (layerInfos, id) {

            if (!layerInfos || !layerInfos.length || id === -1) {
                return false;
            }

            var info = array.filter(layerInfos, function (inf) {
                return inf.id === id;
            });

            return info[0];
        }
    });
});
