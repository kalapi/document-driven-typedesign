'use strict';

var angular = require('../angular');
var _ = require('lodash');


angular.module('ddt').factory('fontFamilyCollection', function($rootScope,
                                                               fontFaceCollection,
                                                               ErrorMessages) {
    var MATRIX_ACTION_ADD = 'add',
        MATRIX_ACTION_REMOVE = 'remove';

    var fontFamilies = [];
    var fontFamiliesToCompare = [];
    var fontComparisonMatrix;
    var fontFamilyWatchers = new Map();

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

    var addToComparison = function(familyToAdd) {
        // First ensure the family exists in this collection.
        var familyInCollection = _.find(fontFamilies, function(f) {
            return f === familyToAdd;
        });

        if (!angular.isDefined(familyInCollection)) {
            throw new Error(ErrorMessages.FAMILY_DOES_NOT_EXIST);
        }

        if (!isAddedToComparison(familyToAdd)) {
            fontFamiliesToCompare.push(familyToAdd);
        } else {
            // Adding an existing family to collection is a no-op.
            return;
        }

        // Set up a watcher so if the number of fonts in the family
        // changes, we can recalculate the comparison matrix.
        var watcher = $rootScope.$watch(function() {
            return familyToAdd.fonts.length;
        }, function(oldVal, newVal) {
            // When the fonts array changes, we just remove and
            // re-add this family to comparison.
            if (oldVal !== newVal) {
                removeFromComparison(familyToAdd);
                addToComparison(familyToAdd);
            }
        });

        fontFamilyWatchers.set(familyToAdd, watcher);

        // Now update the comparison matrix.
        _updateComparisonMatrix(familyToAdd, MATRIX_ACTION_ADD)
    };

    var remove = function(family) {
        _.pull(fontFamilies, family);
        removeFromComparison(family);
    };

    var removeFromComparison = function(familyToRemove) {
        _.pull(fontFamiliesToCompare, familyToRemove);

        // Now update the comparison matrix.
        _updateComparisonMatrix(familyToRemove, MATRIX_ACTION_REMOVE);

        // Remove the watcher.
        fontFamilyWatchers.get(familyToRemove)();
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

    var fontsInComparisonMatrix = function() {
        return _.flatten(fontComparisonMatrix);
    };

    var swapFontsToCompare = function(font1, font2) {
        var _findInComparisonMatrix = function(font) {
            for (var i = 0; i < fontComparisonMatrix.length; i++) {
                for (var j = 0; j < fontComparisonMatrix[i].length; j++) {
                    if (fontComparisonMatrix[i][j] === font) {
                        return [i, j];
                    }
                }
            }

            return -1;
        };

        var index1 = _findInComparisonMatrix(font1);
        var index2 = _findInComparisonMatrix(font2);

        if ((index1 === -1 || index2 === -1) && !(index1 === -1 && index2 === -1)) {
            // If one, but not both, fonts are not in the matrix, then
            // we're not swapping positions within the matrix but simply
            // replacing one font with another.
            if (index1 === -1) {
                fontComparisonMatrix[index2[0]][index2[1]] = font1;
            } else if (index2 === -1) {
                fontComparisonMatrix[index1[0]][index1[1]] = font2;
            }
        } else {
            // Otherwise, do a regular swap.
            fontComparisonMatrix[index1[0]][index1[1]] = font2;
            fontComparisonMatrix[index2[0]][index2[1]] = font1;
        }
    };

    // Builds a new comparison matrix and returns it.
    var _buildComparisonMatrix = function(fontFamilies) {
        if (fontFamilies.length < 2) {
            return;
        }

        var minLength = _.size(_.min(fontFamilies, function(family) {
            return family.fonts.length;
        }).fonts);

        var truncatedFonts = _.map(fontFamilies, function(family) {
            return _.take(family.fonts, minLength);
        });

        return _.zip.apply(undefined, truncatedFonts);
    };

    var _updateComparisonMatrix = function(family, action) {
        if (action === MATRIX_ACTION_ADD) {
            // If the matrix is undefined, build it from scratch.
            if (angular.isUndefined(fontComparisonMatrix)) {
                fontComparisonMatrix = _buildComparisonMatrix(fontFamiliesToCompare);
            } else {
                // If the new family has fewer fonts than the comparison matrix,
                // truncate the matrix.
                if (family.fonts.length < fontComparisonMatrix.length) {
                    fontComparisonMatrix = _.take(fontComparisonMatrix, family.fonts.length);
                }

                // Now add fonts from the new family to the matrix.
                for (var i = 0; i < fontComparisonMatrix.length; i++) {
                    fontComparisonMatrix[i].push(family.fonts[i]);
                }
            }
        } else if (action === MATRIX_ACTION_REMOVE) {
            // If there are no more families to compare, set the matrix to undefined.
            if (fontFamiliesToCompare.length < 2) {
                fontComparisonMatrix = undefined;
                return;
            }

            // Otherwise, get rid of all fonts from the family we just removed.
            _.each(fontComparisonMatrix, function(fontGroup) {
                _.each(fontGroup, function(font) {
                    if (_.contains(family.fonts, font)) {
                        _.pull(fontGroup, font);
                    }
                });
            });

            // Next, find the new minLength.
            var minLength = _.size(_.min(fontFamiliesToCompare, function(family) {
                return family.fonts.length;
            }).fonts);

            // Do we need to add more fonts to the comparison matrix?
            if (minLength > fontComparisonMatrix.length) {
                var fontsInMatrix = fontsInComparisonMatrix();

                // Figure out which fonts from each family have not been added
                // to the comparison matrix yet.
                var fontsNotInMatrix = _.map(fontFamiliesToCompare, function(family) {
                    return _.filter(family.fonts, function(font) {
                        return !_.contains(fontsInMatrix, font);
                    });
                });

                // minLength - fontComparisonMatrix.length gives us the extra fonts
                // that we need to add to the matrix. Pick these out from the fonts
                // that are not in the matrix yet.
                var truncatedFonts = _.map(fontsNotInMatrix, function(fontGroup) {
                    return _.take(fontGroup, minLength - fontComparisonMatrix.length);
                });

                // Zip selected fonts and push them into the matrix.
                var zippedFonts = _.zip(truncatedFonts);
                fontComparisonMatrix = fontComparisonMatrix.concat(zippedFonts);
            }
        }
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
        fontsInComparisonMatrix: fontsInComparisonMatrix,
        swapFontsToCompare: swapFontsToCompare,
        generatePlaceholderName: generatePlaceholderName
    };
});