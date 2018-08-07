///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 - 2017 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define([
        'dojo/_base/declare',
        'jimu/BaseWidget',
        'dijit/_WidgetBase',
        'dijit/_TemplatedMixin',
        'dijit/_WidgetsInTemplateMixin',
        'dojo/Evented',
        'dojo/text!./SingleQueryResult.html',
        'dojo/_base/lang',
        'dojo/_base/query',
        'dojo/_base/html',
        'dojo/_base/array',
        'dojo/Deferred',
        'esri/lang',
        'esri/tasks/QueryTask',
        'esri/tasks/FeatureSet',
        'esri/dijit/PopupTemplate',
        'esri/dijit/PopupRenderer',
        'esri/tasks/RelationshipQuery',
        'esri/renderers/SimpleRenderer',
        'jimu/utils',
        'jimu/symbolUtils',
        'jimu/dijit/Popup',
        'jimu/dijit/Message',
        'jimu/dijit/FeatureActionPopupMenu',
        'jimu/BaseFeatureAction',
        'jimu/dijit/SymbolChooser',
        'jimu/LayerInfos/LayerInfos',
        'jimu/FeatureActionManager',
        './SingleQueryLoader',
        './RelatedRecordsResult',
        'jimu/dijit/Report',
        'jimu/dijit/PageUtils',
        'jimu/dijit/LoadingShelter',
        'dijit/form/Select',
    ],
    function (declare, BaseWidget, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented, template, lang, query,
              html, array, Deferred, esriLang, QueryTask, FeatureSet, PopupTemplate, PopupRenderer,
              RelationshipQuery, SimpleRenderer, jimuUtils, jimuSymbolUtils, Popup, Message, PopupMenu, BaseFeatureAction,
              SymbolChooser, LayerInfos, FeatureActionManager, SingleQueryLoader, RelatedRecordsResult, Report, PageUtils,) {

        return declare([BaseWidget, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {

            baseClass: 'single-query-result',
            templateString: template,
            singleQueryLoader: null,
            featureLayer: null, //used for execute queryRelatedFeatures
            singleRelatedRecordsResult: null,
            multipleRelatedRecordsResult: null,
            popupMenu: null,
            resultsList: null,
            vouchers: null,

            //options:
            map: null,
            nls: null,
            currentAttrs: null,
            queryWidget: null,

            //public methods:
            //getCurrentAttrs
            //zoomToLayer
            //executeQueryForFirstTime
            //_emitFeaturesUpdate

            //events:
            //features-update
            //show-related-records
            //hide-related-records

            //we can get where,geometry and resultLayer from singleQueryLoader
            getCurrentAttrs: function () {
                if (this.singleQueryLoader) {
                    return this.singleQueryLoader.getCurrentAttrs();
                }
                return null;
            },

            postCreate: function () {
                this.inherited(arguments);
                //init SingleQueryLoader
                this.singleQueryLoader = new SingleQueryLoader(this.map, this.currentAttrs);
                this.popupMenu = PopupMenu.getInstance();
                this.featureActionManager = FeatureActionManager.getInstance();
                this.btnFeatureAction.title = window.jimuNls.featureActions.featureActions;
            },

            destroy: function () {
                this.emit('features-update', {
                    taskIndex: this.currentAttrs.queryTr.taskIndex,
                    features: []
                });
                this.queryWidget = null;
                var currentAttrs = this.getCurrentAttrs();
                if (currentAttrs) {
                    if (currentAttrs.query) {
                        if (currentAttrs.query.resultLayer) {
                            if (currentAttrs.query.resultLayer.getMap()) {
                                this.map.removeLayer(currentAttrs.query.resultLayer);
                            }
                        }
                        currentAttrs.query.resultLayer = null;
                    }
                }
                this.inherited(arguments);
            },

            _isValidNumber: function (v) {
                return typeof v === "number" && !isNaN(v);
            },

            zoomToLayer: function () {
                var currentAttrs = this.getCurrentAttrs();
                var resultLayer = currentAttrs.query.resultLayer;
                if (resultLayer && !this._isTable(currentAttrs.layerInfo)) {
                    //we should validate geometries to calculate extent
                    var graphics = array.filter(resultLayer.graphics, lang.hitch(this, function (g) {
                        var geo = g.geometry;
                        if (geo) {
                            //x and y maybe "NaN"
                            if (geo.type === 'point') {
                                return this._isValidNumber(geo.x) && this._isValidNumber(geo.y);
                            } else if (geo.type === 'multipoint') {
                                if (geo.points && geo.points.length > 0) {
                                    return array.every(geo.points, lang.hitch(this, function (xyArray) {
                                        if (xyArray) {
                                            return this._isValidNumber(xyArray[0]) && this._isValidNumber(xyArray[1]);
                                        } else {
                                            return false;
                                        }
                                    }));
                                } else {
                                    return false;
                                }
                            } else {
                                return true;
                            }
                        } else {
                            return false;
                        }
                    }));
                    if (graphics.length > 0) {
                        var ext = jimuUtils.graphicsExtent(graphics, 1.4);
                        if (ext) {
                            this.map.setExtent(ext);
                        }
                    }
                }
            },

            _emitFeaturesUpdate: function () {
                this.emit('features-update', {
                    taskIndex: this.currentAttrs.queryTr.taskIndex,
                    features: this.currentAttrs.query.resultLayer.graphics
                });
            },

            //start to query
            executeQueryForFirstTime: function () {
                var def = new Deferred();

                //reset result page
                this._clearResultPage();
                this._hideResultsNumberDiv();

                var currentAttrs = this.getCurrentAttrs();

                var resultLayer = currentAttrs.query.resultLayer;

                var callback = lang.hitch(this, function (features) {
                    if (!this.domNode) {
                        return;
                    }
                    this.shelter.hide();
                    var allCount = currentAttrs.query.allCount;
                    this._updateNumSpan(allCount);
                    if (allCount > 0) {
                        this._addResultItems(features, resultLayer);
                        this._addResultLayerToMap(resultLayer);
                    }
                    def.resolve(allCount);
                    this._emitFeaturesUpdate();
                });

                var errorCallback = lang.hitch(this, function (err) {
                    console.error(err);
                    if (!this.domNode) {
                        return;
                    }
                    this.shelter.hide();
                    if (resultLayer) {
                        this.map.removeLayer(resultLayer);
                    }
                    resultLayer = null;
                    this._showQueryErrorMsg();
                    def.reject(err);
                });

                this.shelter.show();

                if (currentAttrs.queryType !== 3) {
                    this._showResultsNumberDiv();
                }

                //execute Query for first time
                this.singleQueryLoader.executeQueryForFirstTime().then(callback, errorCallback);

                return def;
            },

            getResultLayer: function () {
                var currentAttrs = this.getCurrentAttrs();
                var resultLayer = lang.getObject("query.resultLayer", false, currentAttrs);
                return resultLayer;
            },

            showResultLayer: function () {
                var resultLayer = this.getResultLayer();
                if (resultLayer) {
                    resultLayer.show();
                }
            },

            hideResultLayer: function () {
                var resultLayer = this.getResultLayer();
                if (resultLayer) {
                    resultLayer.hide();
                }
            },

            showLayer: function () {
                this.showResultLayer();
                if (this.multipleRelatedRecordsResult) {
                    this.multipleRelatedRecordsResult.showLayer();
                }
                if (this.singleRelatedRecordsResult) {
                    this.singleRelatedRecordsResult.showLayer();
                }
            },

            hideLayer: function () {
                this.hideResultLayer();
                if (this.multipleRelatedRecordsResult) {
                    this.multipleRelatedRecordsResult.hideLayer();
                }
                if (this.singleRelatedRecordsResult) {
                    this.singleRelatedRecordsResult.hideLayer();
                }
            },

            _addResultLayerToMap: function (resultLayer) {
                if (this.map.graphicsLayerIds.indexOf(resultLayer.id) < 0) {
                    this.map.addLayer(resultLayer);
                }
            },

            _showResultsNumberDiv: function () {
                html.setStyle(this.resultsNumberDiv, 'display', 'block');
            },

            _hideResultsNumberDiv: function () {
                html.setStyle(this.resultsNumberDiv, 'display', 'none');
            },

            _updateNumSpan: function (allCount) {
                this.numSpan.innerHTML = jimuUtils.localizeNumber(allCount);
            },

            _isTable: function (layerDefinition) {
                return layerDefinition.type === "Table";
            },

            _onResultsScroll: function () {
                if (!jimuUtils.isScrollToBottom(this.resultsContainer)) {
                    return;
                }

                var currentAttrs = this.getCurrentAttrs();

                var nextIndex = currentAttrs.query.nextIndex;
                var allCount = currentAttrs.query.allCount;

                if (nextIndex >= allCount) {
                    return;
                }

                var resultLayer = currentAttrs.query.resultLayer;

                var callback = lang.hitch(this, function (features) {
                    if (!this.domNode) {
                        return;
                    }
                    this.shelter.hide();
                    this._addResultItems(features, resultLayer);
                    this._emitFeaturesUpdate();
                });

                var errorCallback = lang.hitch(this, function (err) {
                    console.error(err);
                    if (!this.domNode) {
                        return;
                    }
                    this._showQueryErrorMsg();
                    this.shelter.hide();
                });

                this.shelter.show();

                this.singleQueryLoader.executeQueryWhenScrollToBottom().then(callback, errorCallback);
            },

            _clearResultPage: function () {
                this._hideInfoWindow();
                this._unSelectResultTr();
                html.empty(this.resultsTbody);
                this._updateNumSpan(0);
            },

            _unSelectResultTr: function () {
                if (this.resultTr) {
                    html.removeClass(this.resultTr, 'jimu-state-active');
                }
                this.resultTr = null;
            },

            _selectResultTr: function (tr) {
                this._unSelectResultTr();
                this.resultTr = tr;
                if (this.resultTr) {
                    html.addClass(this.resultTr, 'jimu-state-active');
                }
            },

            _addResultItems: function (features, resultLayer) {
                var currentAttrs = this.getCurrentAttrs();
                var url = currentAttrs.config.url;
                var objectIdField = currentAttrs.config.objectIdField;

                var relationships = this._getCurrentRelationships();
                var popupInfo = currentAttrs.config.popupInfo;
                var popupInfoWithoutMediaInfos = lang.clone(popupInfo);
                popupInfoWithoutMediaInfos.mediaInfos = [];
                var popupTemplate2 = new PopupTemplate(popupInfoWithoutMediaInfos);

                var shouldCreateSymbolNode = true;

                var renderer = resultLayer.renderer;
                if (!renderer) {
                    shouldCreateSymbolNode = false;
                }

                var isWebMapShowRelatedRecordsEnabled = this._isWebMapShowRelatedRecordsEnabled();

                resultsList = [];

                array.forEach(features, lang.hitch(this, function (feature, i) {
                    var trClass = '';
                    if (i % 2 === 0) {
                        trClass = 'even';
                    } else {
                        trClass = 'odd';
                    }

                    resultLayer.add(feature);

                    resultsList.push(feature['attributes']);
                    console.log(resultsList);

                    var options = {
                        resultLayer: resultLayer,
                        feature: feature,
                        trClass: trClass,
                        popupTemplate2: popupTemplate2,
                        relationships: relationships,
                        objectIdField: objectIdField,
                        url: url,
                        relationshipPopupTemplates: currentAttrs.relationshipPopupTemplates,
                        shouldCreateSymbolNode: shouldCreateSymbolNode,
                        isWebMapShowRelatedRecordsEnabled: isWebMapShowRelatedRecordsEnabled
                    };

                    this._createQueryResultItem(options);
                }));

                this.zoomToLayer();
            },

            _createQueryResultItem: function (options) {
                var resultLayer = options.resultLayer;
                var feature = options.feature;
                var trClass = options.trClass;
                var popupTemplate2 = options.popupTemplate2;
                var relationships = options.relationships;
                var objectIdField = options.objectIdField;
                var url = options.url;
                var relationshipPopupTemplates = options.relationshipPopupTemplates;
                var shouldCreateSymbolNode = options.shouldCreateSymbolNode;
                var isWebMapShowRelatedRecordsEnabled = options.isWebMapShowRelatedRecordsEnabled;

                var attributes = feature && feature.attributes;
                if (!attributes) {
                    return;
                }

                //create PopupRenderer
                var strItem = '<tr class="jimu-table-row jimu-table-row-separator query-result-item" ' +
                    ' cellpadding="0" cellspacing="0"><td>' +
                    '<table class="query-result-item-table">' +
                    '<tbody>' +
                    '<tr>' +
                    '<td class="symbol-td"></td><td class="popup-td"></td>' +
                    '</tr>' +
                    '</tbody>' +
                    '</table>' +
                    '</td></tr>';
                var trItem = html.toDom(strItem);
                html.addClass(trItem, trClass);
                html.place(trItem, this.resultsTbody);
                trItem.feature = feature;

                var symbolTd = query('.symbol-td', trItem)[0];
                if (shouldCreateSymbolNode) {
                    try {
                        var renderer = resultLayer.renderer;
                        if (renderer) {
                            var symbol = renderer.getSymbol(feature);
                            if (symbol) {
                                var symbolNode = jimuSymbolUtils.createSymbolNode(symbol, {
                                    width: 32,
                                    height: 32
                                });
                                if (symbolNode) {
                                    html.place(symbolNode, symbolTd);
                                }
                            }
                        }
                    } catch (e) {
                        console.error(e);
                    }
                } else {
                    html.destroy(symbolTd);
                }

                var popupTd = query('.popup-td', trItem)[0];
                var popupRenderer = new PopupRenderer({
                    template: popupTemplate2,
                    graphic: feature,
                    chartTheme: popupTemplate2.chartTheme
                });
                html.place(popupRenderer.domNode, popupTd);
                popupRenderer.startup();

                //create TitlePane for relationships
                if (objectIdField && relationships && relationships.length > 0 && isWebMapShowRelatedRecordsEnabled) {
                    var objectId = feature.attributes[objectIdField];
                    //var lastIndex = relationships.length - 1;
                    array.forEach(relationships, lang.hitch(this, function (relationship) {
                        //{id,name,relatedTableId}
                        //var layerName = this._getLayerNameByRelationshipId(relationship.id);
                        var relationshipLayerInfo = this._getRelationshipLayerInfo(relationship.relatedTableId);
                        var layerName = relationshipLayerInfo.name;
                        var relationshipPopupTemplate = relationshipPopupTemplates[relationship.relatedTableId];

                        var btn = html.create("div", {
                            "class": "related-table-btn",
                            "innerHTML": layerName //this.nls.attributesFromRelationship + ': ' + layerName
                        }, popupTd);
                        btn.queryStatus = "unload";
                        btn.url = url;
                        btn.layerName = layerName;
                        btn.objectId = objectId;
                        btn.relationship = relationship;
                        btn.relationshipLayerInfo = relationshipLayerInfo;
                        btn.relationshipPopupTemplate = relationshipPopupTemplate;
                    }));
                }
            },

            _onBtnMultipleRelatedBackClicked: function () {
                this._showFeaturesResultDiv();
            },

            _onBtnSingleRelatedBackClicked: function () {
                this._showFeaturesResultDiv();
            },

            _showFeaturesResultDiv: function () {
                if (this.multipleRelatedRecordsResult) {
                    this.multipleRelatedRecordsResult.destroy();
                }
                this.multipleRelatedRecordsResult = null;

                if (this.singleRelatedRecordsResult) {
                    this.singleRelatedRecordsResult.destroy();
                }
                this.singleRelatedRecordsResult = null;

                html.addClass(this.multipleRelatedRecordsDiv, 'not-visible');
                html.addClass(this.singleRelatedRecordsResultDiv, 'not-visible');
                html.removeClass(this.featuresResultDiv, 'not-visible');
                this.emit("hide-related-records");
            },

            _showMultipleRelatedRecords: function () {
                if (this.singleRelatedRecordsResult) {
                    this.singleRelatedRecordsResult.destroy();
                }
                this.singleRelatedRecordsResult = null;

                html.addClass(this.featuresResultDiv, 'not-visible');
                html.addClass(this.singleRelatedRecordsResultDiv, 'not-visible');
                html.removeClass(this.multipleRelatedRecordsDiv, 'not-visible');
                this.emit("show-related-records");

                var relationships = this._getCurrentRelationships();
                this.relatedLayersSelect.removeOption(this.relatedLayersSelect.getOptions());
                array.forEach(relationships, lang.hitch(this, function (relationship) {
                    var relationshipLayerInfo = this._getRelationshipLayerInfo(relationship.relatedTableId);
                    var relationshipPopupTemplate = this.currentAttrs.relationshipPopupTemplates[relationship.relatedTableId];
                    var layerName = relationshipLayerInfo.name;

                    this.relatedLayersSelect.addOption({
                        value: relationship.id + "",//should be a string
                        label: layerName,
                        relationship: relationship,
                        relationshipLayerInfo: relationshipLayerInfo,
                        relationshipPopupTemplate: relationshipPopupTemplate
                    });
                }));

                this._onRelatedLayersSelectChanged();
            },

            _onRelatedLayersSelectChanged: function () {
                var value = this.relatedLayersSelect.get('value');
                var option = this.relatedLayersSelect.getOptions(value);
                if (!option) {
                    return;
                }
                /*{
                    value: relationship.id,
                    label: layerName,
                    relationship: relationship,
                    relationshipLayerInfo: relationshipLayerInfo,
                    relationshipPopupTemplate: relationshipPopupTemplate,
                    selected: index === 0
                  }*/
                if (this.multipleRelatedRecordsResult) {
                    this.multipleRelatedRecordsResult.destroy();
                }
                this.multipleRelatedRecordsResult = new RelatedRecordsResult({
                    map: this.map,
                    layerDefinition: option.relationshipLayerInfo,
                    nls: this.nls,
                    config: this.currentAttrs.config
                });
                this.multipleRelatedRecordsResult.placeAt(this.multipleRelatedRecordsDiv, 'first');
                var url = this.currentAttrs.config.url;
                this.shelter.show();
                var errorCallback = lang.hitch(this, function (err) {
                    console.error(err);
                    if (!this.domNode) {
                        return;
                    }
                    this.shelter.hide();
                });
                //var objectIds = this.currentAttrs.query.objectIds;
                this.singleQueryLoader.getObjectIdsForAllRelatedRecordsAction().then(lang.hitch(this, function (objectIds) {
                    var def = this._queryRelatedRecords(url, objectIds, option.relationship.id);
                    def.then(lang.hitch(this, function (response) {
                        if (!this.domNode) {
                            return;
                        }
                        this.shelter.hide();
                        //{objectId:{features,geometryType,spatialReference,transform}}
                        var features = [];
                        array.forEach(objectIds, lang.hitch(this, function (objectId) {
                            var a = response[objectId];
                            if (a && a.features && a.features.length > 0) {
                                features = features.concat(a.features);
                            }
                        }));

                        var relationshipLayerInfo = option.relationshipLayerInfo;
                        var featureSet = new FeatureSet();
                        featureSet.fields = lang.clone(relationshipLayerInfo.fields);
                        featureSet.features = features;
                        featureSet.geometryType = relationshipLayerInfo.geometryType;
                        featureSet.fieldAliases = {};
                        array.forEach(featureSet.fields, lang.hitch(this, function (fieldInfo) {
                            var fieldName = fieldInfo.name;
                            var fieldAlias = fieldInfo.alias || fieldName;
                            featureSet.fieldAliases[fieldName] = fieldAlias;
                        }));
                        this.multipleRelatedRecordsResult.setResult(option.relationshipPopupTemplate, featureSet);
                    }), errorCallback);
                }), errorCallback);
            },

            _showSingleRelatedRecordsDiv: function () {
                if (this.multipleRelatedRecordsResult) {
                    this.multipleRelatedRecordsResult.destroy();
                }
                this.multipleRelatedRecordsResult = null;

                html.addClass(this.featuresResultDiv, 'not-visible');
                html.addClass(this.multipleRelatedRecordsDiv, 'not-visible');
                html.removeClass(this.singleRelatedRecordsResultDiv, 'not-visible');
                this.emit("show-related-records");
            },

            _onSingleRelatedTableButtonClicked: function (target) {
                if (this.singleRelatedRecordsResult) {
                    this.singleRelatedRecordsResult.destroy();
                }
                this.singleRelatedRecordsResult = null;
                var url = target.url;
                var layerName = target.layerName;
                var objectId = target.objectId;
                var relationship = target.relationship;
                var relationshipLayerInfo = target.relationshipLayerInfo;
                var relationshipPopupTemplate = target.relationshipPopupTemplate;
                this.singleRelatedRecordsResult = new RelatedRecordsResult({
                    map: this.map,
                    layerDefinition: relationshipLayerInfo,
                    nls: this.nls,
                    config: this.currentAttrs.config
                });
                this.singleRelatedRecordsResult.placeAt(this.singleRelatedRecordsResultDiv, 'first');
                // this.own(on(this.singleRelatedRecordsResult, 'back', lang.hitch(this, function(){
                //   this._showFeaturesResultDiv();
                // })));
                this._showSingleRelatedRecordsDiv();
                var callback = lang.hitch(this, function () {
                    var featureSet = new FeatureSet();
                    featureSet.fields = lang.clone(relationshipLayerInfo.fields);
                    featureSet.features = target.relatedFeatures;
                    featureSet.geometryType = relationshipLayerInfo.geometryType;
                    featureSet.fieldAliases = {};
                    array.forEach(featureSet.fields, lang.hitch(this, function (fieldInfo) {
                        var fieldName = fieldInfo.name;
                        var fieldAlias = fieldInfo.alias || fieldName;
                        featureSet.fieldAliases[fieldName] = fieldAlias;
                    }));
                    this.singleRelatedRecordsResult.setResult(relationshipPopupTemplate, featureSet);

                    this.relatedTitleDiv.innerHTML = layerName;
                });
                //execute executeRelationshipQuery when firstly click target
                if (target.queryStatus === "unload") {
                    target.queryStatus = "loading";
                    this.shelter.show();
                    this._queryRelatedRecords(url, [objectId], relationship.id).then(lang.hitch(this, function (response) {
                        if (!this.domNode) {
                            return;
                        }
                        this.shelter.hide();
                        //{objectId:{features,geometryType,spatialReference,transform}}
                        var result = response && response[objectId];
                        var features = result && result.features;
                        features = features || [];
                        target.relatedFeatures = features;
                        target.queryStatus = "loaded";
                        callback();
                    }), lang.hitch(this, function (err) {
                        if (!this.domNode) {
                            return;
                        }
                        this.shelter.hide();
                        console.error(err);
                        target.queryStatus = "unload";
                        callback();
                    }));
                } else if (target.queryStatus === "loaded") {
                    callback();
                }
            },

            _queryRelatedRecords: function (url, objectIds, relationshipId) {
                var queryTask = new QueryTask(url);
                var relationshipQuery = new RelationshipQuery();
                relationshipQuery.objectIds = objectIds;
                relationshipQuery.relationshipId = relationshipId;
                relationshipQuery.outFields = ['*'];
                relationshipQuery.returnGeometry = true;
                relationshipQuery.outSpatialReference = this.map.spatialReference;
                return queryTask.executeRelationshipQuery(relationshipQuery);
            },

            _getCurrentRelationships: function () {
                var currentAttrs = this.getCurrentAttrs();
                return currentAttrs.queryTr.layerInfo.relationships || [];
            },

            //{id,name,relatedTableId}
            //relationshipId is the id attribute
            _getRelationshipInfo: function (relationshipId) {
                var relationships = this._getCurrentRelationships();
                for (var i = 0; i < relationships.length; i++) {
                    if (relationships[i].id === relationshipId) {
                        return relationships[i];
                    }
                }
                return null;
            },

            _getRelationshipLayerInfo: function (relatedTableId) {
                var currentAttrs = this.getCurrentAttrs();
                var layerInfo = currentAttrs.relationshipLayerInfos[relatedTableId];
                return layerInfo;
            },

            _tryLocaleNumber: function (value) {
                var result = value;
                if (esriLang.isDefined(value) && isFinite(value)) {
                    try {
                        //if pass "abc" into localizeNumber, it will return null
                        var a = jimuUtils.localizeNumber(value);
                        if (typeof a === "string") {
                            result = a;
                        }
                    } catch (e) {
                        console.error(e);
                    }
                }
                //make sure the retun value is string
                result += "";
                return result;
            },

            _showQueryErrorMsg: function (/* optional */ msg) {
                new Message({
                    message: msg || this.nls.queryError
                });
            },

            _onResultsTableClicked: function (event) {
                var target = event.target || event.srcElement;
                if (!html.isDescendant(target, this.resultsTable)) {
                    return;
                }

                if (html.hasClass(target, 'related-table-btn')) {
                    this._onSingleRelatedTableButtonClicked(target);
                    return;
                }

                var tr = jimuUtils.getAncestorDom(target, lang.hitch(this, function (dom) {
                    return html.hasClass(dom, 'query-result-item');
                }), this.resultsTbody);
                if (!tr) {
                    return;
                }

                this._selectResultTr(tr);

                html.addClass(tr, 'jimu-state-active');
                var feature = tr.feature;
                var geometry = feature.geometry;
                if (geometry) {
                    //var infoContent = tr.infoTemplateContent;
                    var geoType = geometry.type;
                    var centerPoint, extent;
                    var def = null;

                    if (geoType === 'point' || geoType === 'multipoint') {
                        var singlePointFlow = lang.hitch(this, function () {
                            def = new Deferred();
                            var maxLevel = this.map.getNumLevels();
                            var currentLevel = this.map.getLevel();
                            var level2 = Math.floor(maxLevel * 2 / 3);
                            var zoomLevel = Math.max(currentLevel, level2);
                            if (this.map.getMaxZoom() >= 0) {
                                //use tiled layer as base map
                                this.map.setLevel(zoomLevel).then(lang.hitch(this, function () {
                                    this.map.centerAt(centerPoint).then(lang.hitch(this, function () {
                                        def.resolve();
                                    }));
                                }));
                            } else {
                                //use dynamic layer
                                this.map.centerAt(centerPoint).then(lang.hitch(this, function () {
                                    def.resolve();
                                }));
                            }
                        });

                        if (geoType === 'point') {
                            centerPoint = geometry;
                            singlePointFlow();
                        } else if (geoType === 'multipoint') {
                            if (geometry.points.length === 1) {
                                centerPoint = geometry.getPoint(0);
                                singlePointFlow();
                            } else if (geometry.points.length > 1) {
                                extent = geometry.getExtent();
                                if (extent) {
                                    extent = extent.expand(1.4);
                                    centerPoint = geometry.getPoint(0);
                                    def = this.map.setExtent(extent);
                                }
                            }
                        }
                    } else if (geoType === 'polyline') {
                        extent = geometry.getExtent();
                        extent = extent.expand(1.4);
                        centerPoint = extent.getCenter();
                        def = this.map.setExtent(extent);
                    } else if (geoType === 'polygon') {
                        extent = geometry.getExtent();
                        extent = extent.expand(1.4);
                        centerPoint = extent.getCenter();
                        def = this.map.setExtent(extent);
                    } else if (geoType === 'extent') {
                        extent = geometry;
                        extent = extent.expand(1.4);
                        centerPoint = extent.getCenter();
                        def = this.map.setExtent(extent);
                    }

                    if (def) {
                        def.then(lang.hitch(this, function () {
                            if (typeof this.map.infoWindow.setFeatures === 'function') {
                                this.map.infoWindow.setFeatures([feature]);
                            }
                            if (typeof this.map.infoWindow.reposition === 'function') {
                                this.map.infoWindow.reposition();
                            }
                            this.map.infoWindow.show(centerPoint);
                        }));
                    }
                }
            },

            _hideInfoWindow: function () {
                if (this.map && this.map.infoWindow) {
                    this.map.infoWindow.hide();
                    if (typeof this.map.infoWindow.setFeatures === 'function') {
                        this.map.infoWindow.setFeatures([]);
                    }
                }
            },

            /* ----------------------------operations-------------------------------- */

            _getFeatureSet: function () {
                var layer = this.currentAttrs.query.resultLayer;
                var featureSet = new FeatureSet();
                featureSet.fields = lang.clone(layer.fields);
                featureSet.features = [].concat(layer.graphics);
                featureSet.geometryType = layer.geometryType;
                featureSet.fieldAliases = {};
                array.forEach(featureSet.fields, lang.hitch(this, function (fieldInfo) {
                    var fieldName = fieldInfo.name;
                    var fieldAlias = fieldInfo.alias || fieldName;
                    featureSet.fieldAliases[fieldName] = fieldAlias;
                }));
                return featureSet;
            },

            _onBtnMenuClicked: function (evt) {
                var position = html.position(evt.target || evt.srcElement);
                var featureSet = this._getFeatureSet();
                var currentAttrs = this.getCurrentAttrs();
                var layer = currentAttrs.query.resultLayer;
                this.featureActionManager.getSupportedActions(featureSet, layer).then(lang.hitch(this, function (actions) {
                    array.forEach(actions, lang.hitch(this, function (action) {
                        action.data = featureSet;
                    }));

                    if (!currentAttrs.config.enableExport) {
                        var exportActionNames = [
                            'ExportToCSV',
                            'ExportToFeatureCollection',
                            'ExportToGeoJSON',
                            'SaveToMyContent'
                        ];
                        actions = array.filter(actions, lang.hitch(this, function (action) {
                            return exportActionNames.indexOf(action.name) < 0;
                        }));
                    }

                    actions = array.filter(actions, lang.hitch(this, function (action) {
                        return action.name !== 'CreateLayer';
                    }));

                    var removeAction = new BaseFeatureAction({
                        name: "RemoveQueryResult",
                        iconClass: 'icon-close',
                        label: this.nls.removeThisResult,
                        iconFormat: 'svg',
                        map: this.map,
                        onExecute: lang.hitch(this, this._removeResult)
                    });
                    removeAction.name = "RemoveQueryResult";
                    removeAction.data = featureSet;
                    actions.push(removeAction);

                    var relatedRecordAction = this._getRelatedTableAction(featureSet);
                    if (relatedRecordAction) {
                        actions.push(relatedRecordAction);
                    }

                    var symbolAction = this._getSymbolAction(featureSet);
                    if (symbolAction) {
                        actions.push(symbolAction);
                    }

                    this.popupMenu.setActions(actions);
                    this.popupMenu.show(position);
                }));
            },

            _getObjectIdField: function () {
                return this.currentAttrs.config.objectIdField;
            },

            _getSymbolAction: function (featureSet) {
                var action = null;
                if (this.currentAttrs.query.resultLayer.renderer && this.currentAttrs.config.canModifySymbol) {
                    var features = featureSet && featureSet.features;
                    action = new BaseFeatureAction({
                        name: "ChangeSymbol",
                        label: this.nls.changeSymbol,
                        data: features,
                        iconClass: 'icon-edit-symbol',
                        iconFormat: 'svg',
                        map: this.map,
                        onExecute: lang.hitch(this, this._showSymbolChooser)
                    });
                }
                return action;
            },

            _showSymbolChooser: function () {
                var resultLayer = this.currentAttrs.query.resultLayer;
                var renderer = resultLayer.renderer;
                var args = {};
                var symbol = renderer.defaultSymbol || renderer.symbol;
                if (symbol) {
                    args.symbol = symbol;
                } else {
                    var symbolType = jimuUtils.getSymbolTypeByGeometryType(resultLayer.geometryType);
                    args.type = symbolType;
                }
                var symbolChooser = new SymbolChooser(args);
                var popup = new Popup({
                    width: 380,
                    autoHeight: true,
                    titleLabel: this.nls.changeSymbol,
                    content: symbolChooser,
                    onClose: lang.hitch(this, function () {
                        symbolChooser.destroy();
                        symbolChooser = null;
                        popup = null;
                    }),
                    buttons: [{
                        label: window.jimuNls.common.ok,
                        onClick: lang.hitch(this, function () {
                            var symbol = symbolChooser.getSymbol();
                            this._updateSymbol(symbol);
                            popup.close();
                        })
                    }, {
                        label: window.jimuNls.common.cancel,
                        onClick: lang.hitch(this, function () {
                            popup.close();
                        })
                    }]
                });
            },

            _updateSymbol: function (symbol) {
                var renderer = new SimpleRenderer(symbol);
                var resultLayer = this.currentAttrs.query.resultLayer;
                resultLayer.setRenderer(renderer);
                resultLayer.redraw();
                var symbolNodes = query(".symbol", this.resultsTable);
                array.forEach(symbolNodes, lang.hitch(this, function (oldSymbolNode) {
                    var parent = oldSymbolNode.parentElement;
                    html.destroy(oldSymbolNode);
                    var newSymbolNode = jimuSymbolUtils.createSymbolNode(symbol, {
                        width: 32,
                        height: 32
                    });
                    if (newSymbolNode) {
                        html.place(newSymbolNode, parent);
                    }
                }));
            },

            _getRelatedTableAction: function (featureSet) {
                var action = null;
                var features = featureSet && featureSet.features;
                var relationships = this._getCurrentRelationships();
                var objectIdField = this._getObjectIdField();
                if (objectIdField && features.length > 0 && relationships && relationships.length > 0 &&
                    this._isWebMapShowRelatedRecordsEnabled()) {
                    action = new BaseFeatureAction({
                        iconClass: 'icon-show-related-record',
                        icon: '',
                        data: featureSet,
                        label: this.nls.showAllRelatedRecords,
                        onExecute: lang.hitch(this, function () {
                            this._showMultipleRelatedRecords();
                            var def = new Deferred();
                            def.resolve();
                            return def;
                        }),
                        getIcon: function () {
                            return "";
                        }
                    });
                }
                return action;
            },

            _isWebMapShowRelatedRecordsEnabled: function () {
                //#2887
                var popupInfo = this.currentAttrs.config.popupInfo;
                if (popupInfo.relatedRecordsInfo) {
                    return popupInfo.relatedRecordsInfo.showRelatedRecords !== false;
                }
                return true;
            },

            _removeResult: function () {
                this.queryWidget.removeSingleQueryResult(this);
                this._hideInfoWindow();
            },

            _getAvailableWidget: function (widgetName) {
                var appConfig = this.queryWidget.appConfig;
                var attributeTableWidget = appConfig.getConfigElementsByName(widgetName)[0];
                if (attributeTableWidget && attributeTableWidget.visible) {
                    return attributeTableWidget;
                }
                return null;
            },
            _onBtnPrintClicked: function () {
                let voucher = new Report({
                    printTaskUrl: "https://gis.wvwd.org/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task",
                    reportLayout: {
                        "pageSize": PageUtils.PageSizes.A4,
                        "orientation": PageUtils.Orientation.Portrait
                    }
                });

                let monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September",
                    "October", "November", "December"
                ];

                let today = new Date();
                let dd = today.getDate();
                let mm = today.getMonth() + 1;
                let yyyy = today.getFullYear();
                let currentMonth = monthNames[mm - 1];

                if (dd < 10) {
                    dd = '0' + dd
                }
                if (mm < 10) {
                    mm = '0' + mm
                }

                let currentDateTime = new Date(resultsList["0"].current_controller_date_time);
                currentDateTime = currentDateTime.toLocaleDateString();
                let changeDateTime = new Date(resultsList["0"].changes_recom_date_time);
                changeDateTime = changeDateTime.toLocaleDateString();
                let waterAuditDate = new Date(resultsList["0"].water_audite_date);
                waterAuditDate = waterAuditDate.toLocaleDateString();

                let fName = resultsList[0].cu_firstName;
                let lName = resultsList[0].cu_lastName;
                let addressResults = resultsList[0].address;
                let currentRead = resultsList["0"].current_read;
                let unitsLastRead = resultsList["0"].units_used_since_last_read;
                let waterSpinning = resultsList["0"].water_flow_indicator_spinning;
                let numToilets = resultsList["0"].num_of_toliets;
                let anyLeaks = resultsList["0"].any_leaks;
                let currentIrrMethod = resultsList["0"].current_irrigation_method;
                let recentChangesByCust = resultsList["0"].recent_changes_made_by_customer;
                let currentNumZones = resultsList["0"].current_controller_num_zones;
                let currentWateringDays = resultsList["0"].current_controller_watering_day;

                let cuZ1Broken = resultsList["0"].current_controller_zone1_broken;
                let cuZ2Broken = resultsList["0"].current_controller_zone2_broken;
                let cuZ3Broken = resultsList["0"].current_controller_zone3_broken;
                let cuZ4Broken = resultsList["0"].current_controller_zone4_broken;
                let cuZ5Broken = resultsList["0"].current_controller_zone5_broken;
                let cuZ6Broken = resultsList["0"].current_controller_zone6_broken;

                let cuZ1Minute = resultsList["0"].current_controller_zone1_minute;
                let cuZ2Minute = resultsList["0"].current_controller_zone2_minute;
                let cuZ3Minute = resultsList["0"].current_controller_zone3_minute;
                let cuZ4Minute = resultsList["0"].current_controller_zone4_minute;
                let cuZ5Minute = resultsList["0"].current_controller_zone5_minute;
                let cuZ6Minute = resultsList["0"].current_controller_zone6_minute;

                let cuZ1Other = resultsList["0"].current_controller_zone1_other_;
                let cuZ2Other = resultsList["0"].current_controller_zone2_other_;
                let cuZ3Other = resultsList["0"].current_controller_zone3_other_;
                let cuZ4Other = resultsList["0"].current_controller_zone4_other_;
                let cuZ5Other = resultsList["0"].current_controller_zone5_other_;
                let cuZ6Other = resultsList["0"].current_controller_zone6_other_;

                let changerWateringDays = resultsList["0"].changes_recom_watering_days;

                let chZ1Minutes = resultsList["0"].changes_recom_zone1_minutes;
                let chZ2Minutes = resultsList["0"].changes_recom_zone2_minutes;
                let chZ3Minutes = resultsList["0"].changes_recom_zone3_minutes;
                let chZ4Minutes = resultsList["0"].changes_recom_zone4_minutes;
                let chZ5Minutes = resultsList["0"].changes_recom_zone5_minutes;
                let chZ6Minutes = resultsList["0"].changes_recom_zone6_minutes;

                let notes = resultsList["0"].notes

                let printData = [
                    {
                        type: "html",
                        data: `
<style type="text/css">
.tg  {border-collapse:collapse;border-spacing:0;border:none;}
.tg td{font-family:Arial, sans-serif;font-size:14px;padding:10px 5px;border-style:solid;border-width:0px;overflow:hidden;word-break:normal;}
.tg th{font-family:Arial, sans-serif;font-size:14px;font-weight:normal;padding:10px 5px;border-style:solid;border-width:0px;overflow:hidden;word-break:normal;}
.tg .tg-cpu2{border-color:#000000;vertical-align:top; border: solid; border-width: thin}
.tg .tg-kiyw{background-color:#efefef;border-color:inherit;vertical-align:top}
.tg .tg-uj5n{background-color:#acecff;border-color:#000000;text-align:center;vertical-align:top; border: solid; border-width: thin}
.tg .tg-us36{border-color:inherit;vertical-align:top}
.tg .tg-wp8o{border-color:#000000;text-align:center;vertical-align:top}
.tg .tg-lqy6{text-align:right;vertical-align:top}
.tg .tg-s7z9{font-weight:bold;text-decoration:underline;border-color:inherit;vertical-align:top}
.tg .tg-6hj7{background-color:#000000;border-color:#000000;vertical-align:top; border: solid; border-width: thin}
.tg .tg-xja8{background-color:#efefef;border-color:#000000;vertical-align:top; border: solid; border-width: thin}
</style>
<table class="tg" style="width: 100%; height: 100%; margin: 0 auto;">
<colgroup>
<col style="width: 271px">
<col style="width: 99px">
<col style="width: 128px">
<col style="width: 181px">
<col style="width: 84px">
<col style="width: 21px">
<col style="width: 21px">
<col style="width: 202px">
<col style="width: 132px">
<col style="width: 21px">
<col style="width: 21px">
</colgroup>
  <tr>
    <th class="tg-lqy6" colspan="9"><span style="font-style:italic">Water Audit Date:</span></th>
    <th class="tg-us36" colspan="2">${waterAuditDate}</th>
  </tr>
  <tr>
    <td class="tg-wp8o" colspan="11">${fName} ${lName} &amp; ${addressResults}</td>
  </tr>
  <tr>
    <td class="tg-us36" colspan="11"></td>
  </tr>
  <tr>
    <td class="tg-wp8o" colspan="11">Findings &amp; Recommendations</td>
  </tr>
  <tr>
    <td class="tg-us36" colspan="11"></td>
  </tr>
  <tr>
    <td class="tg-us36">Current Read:</td>
    <td class="tg-us36" colspan="2">${currentRead}</td>
    <td class="tg-us36">Units used since last read:</td>
    <td class="tg-us36" colspan="3">${unitsLastRead}</td>
    <td class="tg-us36">Water flow indicator spinning?</td>
    <td class="tg-us36" colspan="3">${waterSpinning}</td>
  </tr>
  <tr>
    <td class="tg-us36" colspan="11"></td>
  </tr>
  <tr>
    <td class="tg-us36">No. of Toilets:</td>
    <td class="tg-us36" colspan="2">${numToilets}</td>
    <td class="tg-us36">Any leaks? (explain):</td>
    <td class="tg-us36" colspan="7">${anyLeaks}</td>
  </tr>
  <tr>
    <td class="tg-us36" colspan="11"></td>
  </tr>
  <tr>
    <td class="tg-us36">Current Irrigation Method:</td>
    <td class="tg-us36" colspan="10">${currentIrrMethod}</td>
  </tr>
  <tr>
    <td class="tg-us36" colspan="11"></td>
  </tr>
  <tr>
    <td class="tg-us36">Recent Changes Made by Customer:</td>
    <td class="tg-us36" colspan="10">${recentChangesByCust}</td>
  </tr>
  <tr>
    <td class="tg-us36" colspan="11"></td>
  </tr>
  <tr>
    <td class="tg-s7z9">Current Irrigation Controller Schedule:</td>
    <td class="tg-us36" colspan="10"></td>
  </tr>
  <tr>
    <td class="tg-us36">Correct Date &amp; Time?:</td>
    <td class="tg-us36" colspan="10">${currentDateTime}</td>
  </tr>
  <tr>
    <td class="tg-us36">Total No. of Zones:</td>
    <td class="tg-us36" colspan="10">${currentNumZones}</td>
  </tr>
  <tr>
    <td class="tg-us36">Watering Days:</td>
    <td class="tg-us36" colspan="2">${currentWateringDays}</td>
    <td class="tg-us36" colspan="8"></td>
  </tr>
  <tr>
    <td class="tg-us36">Watering Time(s):</td>
    <td class="tg-us36" colspan="10"></td>
  </tr>
  <tr>
    <td class="tg-us36" colspan="11"></td>
  </tr>
  <tr>
    <td class="tg-6hj7"></td>
    <td class="tg-uj5n">Minutes</td>
    <td class="tg-uj5n">Broken Sprinkler</td>
    <td class="tg-uj5n" colspan="8">Other Issues</td>
  </tr>
  <tr>
    <td class="tg-xja8">Zone 1</td>
    <td class="tg-cpu2">${cuZ1Minute}</td>
    <td class="tg-cpu2">${cuZ1Broken}</td>
    <td class="tg-cpu2" colspan="8">${cuZ1Other}</td>
  </tr>
  <tr>
    <td class="tg-xja8">Zone 2</td>
    <td class="tg-cpu2">${cuZ2Minute}</td>
    <td class="tg-cpu2">${cuZ2Broken}</td>
    <td class="tg-cpu2" colspan="8">${cuZ2Other}</td>
  </tr>
  <tr>
    <td class="tg-xja8">Zone 3</td>
    <td class="tg-cpu2">${cuZ3Minute}</td>
    <td class="tg-cpu2">${cuZ3Broken}</td>
    <td class="tg-cpu2" colspan="8">${cuZ3Other}</td>
  </tr>
  <tr>
    <td class="tg-xja8">Zone 4</td>
    <td class="tg-cpu2">${cuZ4Minute}</td>
    <td class="tg-cpu2">${cuZ4Broken}</td>
    <td class="tg-cpu2" colspan="8">${cuZ4Other}</td>
  </tr>
  <tr>
    <td class="tg-xja8">Zone 5</td>
    <td class="tg-cpu2">${cuZ5Minute}</td>
    <td class="tg-cpu2">${cuZ5Broken}</td>
    <td class="tg-cpu2" colspan="8">${cuZ5Other}</td>
  </tr>
  <tr>
    <td class="tg-xja8">Zone 6</td>
    <td class="tg-cpu2">${cuZ6Minute}</td>
    <td class="tg-cpu2">${cuZ6Broken}</td>
    <td class="tg-cpu2" colspan="8">${cuZ6Other}</td>
  </tr>
  <tr>
    <td class="tg-us36" colspan="11"></td>
  </tr>
  <tr>
    <td class="tg-s7z9">Changes/Recommendations:</td>
    <td class="tg-us36" colspan="10"></td>
  </tr>
  <tr>
    <td class="tg-us36">Correct Date &amp; Time:</td>
    <td class="tg-us36" colspan="10">${changeDateTime}</td>
  </tr>
  <tr>
    <td class="tg-us36">Watering Days:</td>
    <td class="tg-us36" colspan="2">${changerWateringDays}</td>
    <td class="tg-us36" colspan="8"></td>
  </tr>
  <tr>
    <td class="tg-us36">Watering Time(s):</td>
    <td class="tg-us36" colspan="10"></td>
  </tr>
  <tr>
    <td class="tg-us36" colspan="11"></td>
  </tr>
  <tr>
    <td class="tg-6hj7"></td>
    <td class="tg-uj5n">Minutes</td>
    <td class="tg-us36" colspan="9"></td>
  </tr>
  <tr>
    <td class="tg-xja8">Zone 1</td>
    <td class="tg-cpu2">${chZ1Minutes}</td>
    <td class="tg-us36" colspan="9"></td>
  </tr>
  <tr>
    <td class="tg-xja8">Zone 2</td>
    <td class="tg-cpu2">${chZ2Minutes}</td>
    <td class="tg-us36" colspan="9"></td>
  </tr>
  <tr>
    <td class="tg-xja8">Zone 3</td>
    <td class="tg-cpu2">${chZ3Minutes}</td>
    <td class="tg-us36" colspan="9"></td>
  </tr>
  <tr>
    <td class="tg-xja8">Zone 4</td>
    <td class="tg-cpu2">${chZ4Minutes}</td>
    <td class="tg-us36" colspan="9"></td>
  </tr>
  <tr>
    <td class="tg-xja8">Zone 5</td>
    <td class="tg-cpu2">${chZ5Minutes}</td>
    <td class="tg-us36" colspan="9"></td>
  </tr>
  <tr>
    <td class="tg-xja8">Zone 6</td>
    <td class="tg-cpu2">${chZ6Minutes}</td>
    <td class="tg-us36" colspan="9"></td>
  </tr>
  <tr>
    <td class="tg-us36"></td>
    <td class="tg-us36"></td>
    <td class="tg-us36"></td>
    <td class="tg-us36"></td>
    <td class="tg-us36"></td>
    <td class="tg-us36"></td>
    <td class="tg-us36"></td>
    <td class="tg-us36"></td>
    <td class="tg-us36"></td>
    <td class="tg-us36"></td>
    <td class="tg-us36"></td>
  </tr>
  <tr>
    <td class="tg-kiyw">Notes:</td>
    <td class="tg-kiyw">${notes}</td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
  </tr>
  <tr>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
  </tr>
  <tr>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
  </tr>
  <tr>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
  </tr>
  <tr>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
  </tr>
  <tr>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
  </tr>
  <tr>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
  </tr>
  <tr>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
  </tr>
  <tr>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
  </tr>
  <tr>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
  </tr>
  <tr>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
  </tr>
  <tr>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
  </tr>
  <tr>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
  </tr>
  <tr>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
    <td class="tg-kiyw"></td>
  </tr>
</table>`
                    }];
                voucher.print("West Valley Water District", printData);
            },

            _openAttributeTable: function () {
                var attributeTableWidget = this._getAvailableWidget("AttributeTable");

                if (!attributeTableWidget) {
                    return;
                }

                var layerInfosObj = LayerInfos.getInstanceSync();
                var layerId = this.currentAttrs.query.resultLayer.id;
                var layerInfo = layerInfosObj.getLayerInfoById(layerId);
                var widgetManager = this.queryWidget.widgetManager;
                widgetManager.triggerWidgetOpen(attributeTableWidget.id).then(lang.hitch(this, function () {
                    this.queryWidget.publishData({
                        'target': 'AttributeTable',
                        'layer': layerInfo
                    });
                }));
            }

        });
    });