'use strict';

var angular = require('../angular');
var _ = require('lodash');


angular.module('ddt').factory('fontFamilyCollection', function(ErrorMessages, $localForage, comparisonMatrix) {
    var fontFamilies = [];

    // When adding a new family, we name it "Font Family X" by default,
    // where X is an integer. fontFamiliesCounter is X, and it's bumped
    // up every time a new family is added.
    var fontFamiliesCounter = 1;

    var families = function() {
        // TODO: expose this read-only.
        return fontFamilies;
    };

    var add = function(family, noPersist) {
        if (angular.isDefined(findByName(family.name))) {
            throw new Error(ErrorMessages.FAMILY_ALREADY_EXISTS);
        }

        fontFamilies.push(family);
        fontFamiliesCounter++;

        if (!noPersist) {
            _persistFontFamily(family);
        }
    };

    var remove = function(family) {
        _removePersistedFontFamily(family);
        _.pull(fontFamilies, family);
        comparisonMatrix.removeFamily(family);
    };

    var count = function() {
        return _.size(fontFamilies);
    };

    var generatePlaceholderName = function() {
        return 'New Family ' + fontFamiliesCounter.toString();
    };

    var findByName = function(name) {
        return _.find(fontFamilies, function(family) {
            return family.name === name;
        });
    };

    var _persistFontFamily = function(family) {
        $localForage.getItem(family.name)
            .then(function(persistedFamily) {
                if (angular.isUndefined(persistedFamily)) {
                    family.serialize()
                        .then(function(serializedFamily) {
                            $localForage.setItem(family.name, serializedFamily);
                        });
                }
            });
    };

    var _removePersistedFontFamily = function(family) {
        $localForage.removeItem(family.name);
    };

    return {
        families: families,
        add: add,
        remove: remove,
        count: count,
        findByName: findByName,
        generatePlaceholderName: generatePlaceholderName
    };
});
