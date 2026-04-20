WMEAC.addClosure = function (options, successHandler, failureHandler)
{
    if (options &&
        options.hasOwnProperty('segments') &&
        options.hasOwnProperty('reason') &&
        options.hasOwnProperty('direction') &&
        options.hasOwnProperty('startDate') &&
        options.hasOwnProperty('endDate') &&
        options.hasOwnProperty('location') &&
        options.hasOwnProperty('permanent'))
    {
        WMEAC.log("Adding closure: ", options);
        var fail = function (e) {
                if (failureHandler)
                    failureHandler(e);
                else
                    WMEAC.log("Failed to create closure:", f);
        };
        var done = function (e) {
            // since the save call does not return any error status, look for the error dialog in the DOM
            const er = document.querySelector('.error-list');

            if (er) {
                const ertx = er.querySelector('.description').textContent;
                er.querySelector('.close-button').click();
                console.error('CSV file error, ' + ertx);
                if (failureHandler) {
                    failureHandler( {errors: [{attributes: {details: ertx}}]} );
                }
                WMEAC.wmeSDK.Editing.undoAll(); // undo the closure actions that had an error
            }
            else {
                if (successHandler)
                    successHandler(e);
                else
                    WMEAC.log("Closure successful:", e);
            }
        };
    
        const mte = options.eventId ? options.eventId : null;
        const sd = new Date(options.startDate);
        const ed = new Date(options.endDate);
        let sdoff = sd.getTimezoneOffset() * 60000;
        let edoff = ed.getTimezoneOffset() * 60000;
        let args = {
            description: options.reason,
            endDate: ed.valueOf() - edoff,
            fromNodeClosed: false,
            isForward: false,
            isPermanent: options.permanent,
            segmentId: 0,
            startDate: sd.valueOf() - sdoff,
            trafficEventId: mte
        };
        let revsegs = WMEAC.wmeSDK.DataModel.Segments.getReversedSegments( { segmentIds: options.segments });
        for (let s in options.segments) {
            args.segmentId = Number(options.segments[s]);
            let dir = options.direction;
            if (dir != WMEAC.sharedClosureDirection.TWO_WAY && revsegs.length > 0) {
                for (let r in revsegs) {
                    if (revsegs[r].id == args.segmentId) {
                        dir = (dir==WMEAC.sharedClosureDirection.A_TO_B) ? WMEAC.sharedClosureDirection.B_TO_A : WMEAC.sharedClosureDirection.A_TO_B;
                        break;
                    }
                }
            }
            try {
                if (dir==WMEAC.sharedClosureDirection.A_TO_B || dir==WMEAC.sharedClosureDirection.TWO_WAY) {
                    args.isForward = true;
                    WMEAC.wmeSDK.DataModel.RoadClosures.addClosure(args);
                }
                if (dir==WMEAC.sharedClosureDirection.B_TO_A || dir==WMEAC.sharedClosureDirection.TWO_WAY) {
                    args.isForward = false;
                    WMEAC.wmeSDK.DataModel.RoadClosures.addClosure(args);
                }
            } catch(e) {
                console.error("AC error addClosure",e);
                fail({errors: [{attributes: {details: e.message}}]});
            }
        }
        WMEAC.wmeSDK.Editing.save().then(
            (value) => {
                done(value);
            },
            (reason) => {
                fail(reason);
            });

        return true;
    }
    return false;
};

WMEAC.setClosureNodes = function(shClosure)
{
    for (const n of shClosure.closureNodes.models) {
        if (!WMEAC.closeInsideNodes) {
            n.attributes.isClosed = false;
        }
    }
};

WMEAC.addClosureListFromSelection = function (closureList, successHandler, failureHandler, endHandler, i)
{
    if (i>=closureList.length)
    {
        WMEAC.reloadClosuresLayer(function () {
            if (endHandler) endHandler();
        });
        return;
    }
    
    var c=closureList[i];
    var fail = function (e) {
        if (failureHandler)
        {
            var details = [];
            if (e.message) { console.error('AC: ' + e.message + ' - ' + e.stack); }
            if (typeof e == 'string') {
                details.push(e);
            } else {
                e.errors.forEach(function (err) {
                    if (err.hasOwnProperty('attributes') && err.attributes.hasOwnProperty('details'))
                        details.push(err.attributes.details);
                });
            }
            failureHandler(i, details.join (' | '));
        }
        else
            WMEAC.log("Failed to create closure:", e);
        WMEAC.addClosureListFromSelection(closureList, successHandler, failureHandler, endHandler, i+1);

    };
    var done = function (e) {
        // since the save call does not return any error status, look for the error dialog in the DOM
        const er = document.querySelector('.error-list');

        if (er) {
            const ertx = er.querySelector('.description').textContent;
            er.querySelector('.close-button').click();
            console.error('AC closure error, ' + ertx);
            if (failureHandler) {
                failureHandler(i, ertx );
            }
            WMEAC.wmeSDK.Editing.undoAll(); // undo the closure actions that had an error
        }
        else if (successHandler) {
            successHandler(i, "OK");
        }
        else
            WMEAC.log("Closure successful:", e);
        WMEAC.addClosureListFromSelection(closureList, successHandler, failureHandler, endHandler, i+1);
    };

    var segIDs = WMEAC.wmeSDK.Editing.getSelection();
    const mte = closureList[i].eventId ? closureList[i].eventId : null;
    const sd = new Date(closureList[i].startDate);
    const ed = new Date(closureList[i].endDate);
    let sdoff = sd.getTimezoneOffset() * 60000;
    let edoff = ed.getTimezoneOffset() * 60000;
    let args = {
        description: closureList[i].reason,
        endDate: ed.valueOf() - edoff,
        fromNodeClosed: false,
        isForward: false,
        isPermanent: closureList[i].permanent,
        segmentId: 0,
        startDate: sd.valueOf() - sdoff,
        trafficEventId: mte
    };

    let revsegs = WMEAC.wmeSDK.DataModel.Segments.getReversedSegments( { segmentIds: segIDs.ids });
    for (let s in segIDs.ids) {
        args.segmentId = segIDs.ids[s];
        let dir = closureList[i].direction;
        if (dir != WMEAC.sharedClosureDirection.TWO_WAY && revsegs.length > 0) {
            for (let r in revsegs) {
                if (revsegs[r].id == args.segmentId) {
                    dir = (dir==WMEAC.sharedClosureDirection.A_TO_B) ? WMEAC.sharedClosureDirection.B_TO_A : WMEAC.sharedClosureDirection.A_TO_B;
                    break;
                }
            }
        }
        try {
            if (dir==WMEAC.sharedClosureDirection.A_TO_B || dir==WMEAC.sharedClosureDirection.TWO_WAY) {
                args.isForward = true;
                WMEAC.wmeSDK.DataModel.RoadClosures.addClosure(args);
            }
            if (dir==WMEAC.sharedClosureDirection.B_TO_A || dir==WMEAC.sharedClosureDirection.TWO_WAY) {
                args.isForward = false;
                WMEAC.wmeSDK.DataModel.RoadClosures.addClosure(args);
            }
        } catch(e) {
            console.error("AC error addClosure",e);
            fail( e.message );
        }
    }
    WMEAC.wmeSDK.Editing.save().then(
        (value) => {
            done(value);
        },
        (reason) => {
            fail(reason);
        });

};

/* NOT CURRENTLY USED ---
WMEAC.addClosureFromSelection = function (options, successHandler, failureHandler)
{
    if (options &&
        options.hasOwnProperty('reason') &&
        options.hasOwnProperty('direction') &&
        options.hasOwnProperty('startDate') &&
        options.hasOwnProperty('endDate') &&
        options.hasOwnProperty('location') &&
        options.hasOwnProperty('permanent'))
    {
        WMEAC.log("Adding closure: ", options);
        var fail = function (e) {
            return function (f) {
                if (failureHandler)
                    failureHandler(f);
                else
                    WMEAC.log("Failed to create closure:", f);
            };
        };
        var done = function (e) {
            return function (f) {
                if (successHandler)
                    successHandler(f);
                else
                    WMEAC.log("Closure successful:", f);
            };
        };
    
        var cab = require("Waze/Modules/Closures/Models/ClosureActionBuilder");
        var sc = require("Waze/Modules/Closures/Models/SharedClosure");
        var t = {};
        var segIDs = WMEAC.wmeSDK.Editing.getSelection();
        var segs = WMEAC.segmentsIDsToSegments(segIDs);
        // SDK - need old style segment objects for now since closure code called getID() on these objects
        var oldsegs = segs.map (function (e) {
            return (W.model.segments.getObjectById(e.id));
        });
        var closureDetails = {closures: [], attributions: [], reason: options.reason + String.fromCharCode(160), direction: options.direction, startDate: options.startDate, endDate: options.endDate, location: options.location, permanent: options.permanent, segments: oldsegs, closuresType: 'roadClosure', reverseSegments: W.selectionManager.getReversedSegments()};
        if (options.hasOwnProperty('eventId') && options.eventId!=null) closureDetails.eventId = options.eventId;
        var c = new sc(closureDetails, {dataModel: W.model, segmentSelection: W.selectionManager.getSegmentSelection(), isNewClosure: true, closedNodesMap: {} });
        WMEAC.setClosureNodes(c);
        t.actions=[cab.add(c, W.loginManager.user, W.model)];
        W.controller.save(t).then(done()).catch(fail());
        return true;
    }
    return false;
};
*/

// closure removal not currently supported in the SDK
WMEAC.removeClosure = function (closures, successHandler, failureHandler)
{
    var fail = function (e) {
        return function (f) {
            if (failureHandler)
                failureHandler(f);
            else
                WMEAC.log("Failed to delete closure:", f);
        };
    };
    var done = function (e) {
        return function (f) {
            if (successHandler)
                successHandler(f);
            else
                WMEAC.log("Closure deletion successful:", f);
        };
    };

    var cab = require("Waze/Modules/Closures/Models/ClosureActionBuilder");
    var sc = require("Waze/Modules/Closures/Models/SharedClosure");
    var t = {};
    let segs = WMEAC.segmentsIDsToSegments(closures.map(closure => closure.attributes.segID)); // SDK - closures is internal objects for now
    // SDK - need old style segment objects for now since closure code called getID() on these objects
    var oldsegs = segs.map (function (e) {
        return (W.model.segments.getObjectById(e.id));
    });
    var sclo = new sc({segments: oldsegs, closures, reverseSegments: W.selectionManager.getReversedSegments()}, {dataModel: W.model, segmentSelection: W.selectionManager.getSegmentSelection(), isNew: true});
    t.actions=[cab.delete(W.model,sclo)];
    W.controller.save(t).then(done()).catch(fail());
    return true;
};
