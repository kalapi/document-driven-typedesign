'use strict';

var angular = require('../angular');
var _ = require('lodash');


angular.module('ddt').factory('fontFamilyCollection', function(fontFaceCollection, ErrorMessages) {
    var fontFamilies = [];
    var fontFamiliesToCompare = [];
    var fontComparisonMatrix;

    // When adding a new family, we name it "Font Family X" by default,
    // where X is an integer. fontFamiliesCounter is X, and it's bumped
    // up every time a new family is added.
    var fontFamiliesCounter = 1;

    var families = function() {
        // TODO: expose this read-only.
        return fontFamilies;
    };

    var familiesToCompare = function() {
        // TODO: expose this read-only.
        return fontFamiliesToCompare;
    };

    var add = function(family) {
        _.each(family.fonts, function(font) {
            fontFaceCollection.add(font);
        });

        fontFamilies.push(family);
        fontFamiliesCounter++;
    };

    var addToComparison = function(familyToCompare) {
        // First ensure the family exists in this collection.
        var familyInCollection = _.find(fontFamilies, function(f) {
            return f === familyToCompare;
        });

        if (!angular.isDefined(familyInCollection)) {
            throw new Error(ErrorMessages.FAMILY_DOES_NOT_EXIST);
        }

        if (!isAddedToComparison(familyToCompare)) {
            fontFamiliesToCompare.push(familyToCompare);
        }

        fontComparisonMatrix = _buildComparisonMatrix(fontFamiliesToCompare);
    };

    var remove = function(family) {
        _.pull(fontFamilies, family);
        removeFromComparison(family);
    };

    var removeFromComparison = function(family) {
        _.pull(fontFamiliesToCompare, family);
        fontComparisonMatrix = _buildComparisonMatrix(fontFamiliesToCompare);
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

    var isAddedToComparison = function(family) {
        return angular.isDefined(_.find(fontFamiliesToCompare, function(f) {
            return f.name === family.name;
        }));
    };

    var comparisonMatrix = function() {
        return fontComparisonMatrix;
    };

    var _buildComparisonMatrix = function(fontFamilies) {
        var minLength = _.size(_.min(fontFamilies, function(family) {
            return family.fonts.length;
        }).fonts);

        var truncatedFonts = _.map(fontFamilies, function(family) {
            return _.take(family.fonts, minLength);
        });

        return _.zip.apply(undefined, truncatedFonts);
    };

    return {
        families: families,
        familiesToCompare: familiesToCompare,
        add: add,
        remove: remove,
        addToComparison: addToComparison,
        removeFromComparison: removeFromComparison,
        count: count,
        findByName: findByName,
        isAddedToComparison: isAddedToComparison,
        comparisonMatrix: comparisonMatrix,
        generatePlaceholderName: generatePlaceholderName
    };
});
