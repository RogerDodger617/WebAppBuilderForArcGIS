define(['dojo/_base/declare',
        'jimu/BaseWidget',
        'esri/tasks/Geoprocessor',
        'dojo/_base/lang',
        'dijit/form/TextBox',
        'dijit/form/Form',
        "dijit/registry",
        'dgrid/OnDemandGrid',
        'dgrid/extensions/ColumnResizer',
        'dgrid/extensions/ColumnHider',
        'dgrid/Keyboard',
        'dgrid/Selection',
        'dgrid/editor',
        'dojo/has',
        'dojo/on',
        'jimu/loaderplugins/jquery-loader!https://code.jquery.com/jquery-3.3.1.min.js'
    ],
    function (declare, BaseWidget, Geoprocessor, lang, TextBox, form, registry, Grid, ColumnResizer, ColumnHider,
              Keyboard, Selection, Editor, has, on, $) {
        let counter = 2;
        //To create a widget, you need to derive from BaseWidget.
        return declare([BaseWidget], {
            // DemoWidget code goes here

            //please note that this property is be set by the framework when widget is loaded.
            //templateString: template,

            baseClass: 'jimu-widget-rejectparcels',
            apnReject: null,
            dgridReject: null,
            newListedAPNsReject: null,
            parentStringReject: null,
            csaValuesReject: null,
            distListReject: null,
            finalListReject: null,
            searchArrayReject: null,
            distListNoDupesReject: null,
            childrenSearchArrayReject: null,

            startup: function () {
                this.inherited(arguments);
                gpFindParcelReject = new Geoprocessor(
                    "https://rcagapd01.rivcoca.org:6443/arcgis/rest/services/EDA/UpdateFindParcel/GPServer/Update%20Find%20Parcel");
                    // 'https://rcagapd01.rivcoca.org:6443/arcgis/rest/services/EDA/UpdateFindParcelTest/GPServer/Update%20Find%20Parcel%20Test');
                gpAddParcelReject = new Geoprocessor(
                    "https://rcagapd01.rivcoca.org:6443/arcgis/rest/services/EDA/UpdateNewParcel/GPServer/Update%20New%20Parcel");
                    // 'https://rcagapd01.rivcoca.org:6443/arcgis/rest/services/EDA/UpdateNewParcelTest/GPServer/Update%20New%20Parcel%20Test');

                let columnsReject = [
                    {
                        field: 'OBJECTID',
                        label: 'OID',
                        hidden: true
                    },
                    {
                        field: 'APN'
                    },
                    {
                        field: 'District_ID',
                        label: 'District ID'
                    },
                    {
                        field: 'Elevator'
                    },
                    {
                        field: 'Levy'
                    },
                    {
                        field: 'Name'
                    },
                    {
                        field: 'MaxTax'
                    },
                    {
                        field: 'Parent_APN',
                        label: 'Parent APN'
                    }
                ];
                let finalColumnsReject = [
                    {
                        field: 'APN'
                    },
                    {
                        field: 'District_ID',
                        label: 'District ID'
                    },
                    {
                        field: 'Elevator'
                    },
                    {
                        field: 'Levy'
                    },
                    {
                        field: 'Name'
                    },
                    {
                        field: 'MaxTax'
                    },
                    {
                        field: 'Parent_APN',
                        label: 'Parent APN'
                    }
                ];
                let taxColumnsReject = [
                    {
                        field: 'District_ID',
                        label: 'District ID'
                    },
                    {
                        field: 'Elevator'
                    },
                    {
                        field: 'Levy'
                    },
                    {
                        field: 'Name'
                    },
                    {
                        field: 'MaxTax'
                    }
                ];

                dgridReject = new (declare([Grid, ColumnResizer, ColumnHider]))({columns: columnsReject}, 'gridReject');
                taxGridReject = new (declare([Grid, ColumnResizer, Keyboard, Selection, Editor]))({columns: taxColumnsReject}, 'taxGridReject');
                finalGridReject = new (declare([Grid, ColumnResizer]))({columns: finalColumnsReject}, 'finalGridReject');

                newListedAPNsReject = [];
                parentStringReject = '';
                distListReject = [];
                finalListReject = [];
                childrenSearchArrayReject = [];

                $("#existUpdateAPN").prop("checked", true);
                $("#multipleAPNsReject").prop("checked", true);

                csaValuesReject = {
                    "CSA No. 1 (Coronita Lighting)": "681701",
                    "CSA No. 13 (North Palm Springs Lighting)": "681714",
                    "CSA No. 22 (Lake Elsinore Lighting)": "681724",
                    "CSA No. 27 (Cherry Valley Lighting)": "681729",
                    "CSA No. 36 (Idyllwild Lighting,Park, & Rec.)": "681739",
                    "CSA No. 43 (Homeland Lighting)": "681747",
                    "CSA No. 51 (Desert Center/Lake Tamarisk Lighting, Water, Sewer)": "681756",
                    "CSA No. 59 (Hemet Lighting)": "681765",
                    "CSA No. 62 (Ripley Lighting, Water, Sewer)": "681768",
                    "CSA No. 69 (Hemet Lighting)": "681776",
                    "CSA No. 84 (Sun City Lighting)": "681793",
                    "CSA No. 85 (Cabazon Lighting, Park & Rec.)": "681794",
                    "CSA No. 87 (Woodcrest Lighting)": "681796",
                    "CSA No. 89 (Perris Lighting)": "681799",
                    "CSA No. 91 (Valle Vista Lighting)": "681802",
                    "CSA No. 94 (SE Hemet Lighting)": "681805",
                    "CSA No. 97 (Mecca Lighting)": "681808",
                    "CSA No. 103 (Lighting)": "681815",
                    "CSA No. 104 (Sky Valley Roads, Fire Protection)": "681816",
                    "CSA No. 105 (Indio Hills Roads)": "681817",
                    "CSA No. 108 (Minto Way Roads)": "681820",
                    "CSA No. 113 (Woodcrest Lighting)": "681825",
                    "CSA No. 115 (Desert Hot Springs Lighting)": "681712",
                    "CSA No. 117 (Mead Valley Lighting)": "681727",
                    "CSA No. 121 (Bermuda Dunes Lighting, Drainage Basin)": "681833",
                    "CSA No. 122 (Mesa Verde Lighting, Water)": "681834",
                    "CSA No. 124 (Warm Springs Valley Roads)": "681836",
                    "CSA No. 126 (Highgrove Landscaping, Park & Rec.)": "681883",
                    "CSA No. 128E (Lake Mathews Roads)": "681885",
                    "CSA No. 128W (Lake Mathews Roads)": "681886",
                    "CSA No. 132 (The Orchards/Lake Mathews Lighting)": "681789",
                    "CSA No. 134 (Temescal Lighting, Landscaping, & Park)": "681822",
                    "CSA No. 135 (Temescal Lighting)": "681843",
                    "CSA No. 142 (Wildomar Lighting)": "681744",
                    "CSA No. 143 (Lighting, Landscaping, Park & Rec.)": "681823",
                    "CSA No. 143C (Silverhawk C Lighting, Park & Rec. Landscape)": "681828",
                    "CSA No. 143D (Temecula Lighting, Park & Rec. Landscape)": "681829",
                    "CSA No. 146 (Lakeview, Nuevo, Romoland, Homeland Street Lighting, Landscaping)": "681851",
                    "CSA No. 149 (Wine Country Roads)": "681849",
                    "CSA No. 149A (Wine Country Landscaping)": "681848",
                    "CSA No. 152B (Temescal Regional Sports Facilities)": "681870",
                    "CSA No. 152 (City of Corona)": "681854",
                    "CSA No. 152 (City of Desert Hot Springs)": "681857",
                    "CSA No. 152 (Temescal Drainage Basin)": "681869",
                    "CSA No. 152 (City of Lake Elsinore)": "681867",
                    "CSA No. 152 (City of LaQuinta)": "681859",
                    "CSA No. 152 (City of Moreno Valley)": "681860",
                    "CSA No. 152 (City of Murrieta)": "681861",
                    "CSA No. 152 (City of Norco)": "681862",
                    "CSA No. 152 (City of Palm Springs)": "681864",
                    "CSA No. 152 (City of Rancho Mirage)": "681865",
                    "CSA No. 152 (City of Riverside)": "681853",
                    "CSA No. 152 (City of San Jacinto)": "681868",
                    "CSA No. 152 (Street Sweeping)": "681852"
                };

                $.each(csaValuesReject, function (key, value) {
                    $('#csaNameReject').append("<option value='" + key + "'>")
                });
            },

            _onRangeRejectClicked: function () {
                let radioRangeBtnReject = $('input[name="radioRangeBtnReject"]:checked').val();

                if (radioRangeBtnReject === 'range') {
                    $('#lastAPNReject').css("background-color", "#DEDEDE").prop('readonly', true)
                } else {
                    $('#lastAPNReject').css("background-color", "white").prop('readonly', false)
                }
            },

            _onBtnSearchClickedReject: function () {
                parentStringReject = '';
                $('#missingRejectList').empty();
                searchArrayReject = [];
                $.each($('#searchRejectAPN').serializeArray(), function (i, field) {
                    searchArrayReject.push(field.value)
                });
                console.log(searchArrayReject);

                apnReject = $('#apnSearchValuerReject').val();
                $('#gridTableReject, #noAPNReject, #addNewReject').hide();
                gpFindParcelReject.submitJob({Update_APN: searchArrayReject}).then(function (data) {
                    gpFindParcelReject.getResultData(data.jobId, "Result").then(function (jsonResults) {
                        let resultsReject = jsonResults.value;
                        let resultListReject = [];

                        if (typeof resultsReject !== 'undefined' && resultsReject.length > 0) {
                            $.each(resultsReject, function (json) {
                                let parsedJsonResults = $.parseJSON(resultsReject[json]);
                                resultListReject.push(parsedJsonResults)
                            });

                            $.each(resultListReject, function (i, getParentAPN) {
                                if (!parentStringReject) {
                                    if (!getParentAPN.Parent_APN || getParentAPN.Parent_APN === null || /^ *$/.test(getParentAPN.Parent_APN)) {
                                        parentStringReject += getParentAPN.APN;
                                        console.log(getParentAPN.APN)
                                    }
                                    else if (getParentAPN.Parent_APN) {
                                        parentStringReject += getParentAPN.Parent_APN;
                                    }
                                } else {
                                    if (!getParentAPN.Parent_APN || getParentAPN.Parent_APN === null || /^ *$/.test(getParentAPN.Parent_APN)) {
                                        parentStringReject += ', ' + getParentAPN.APN;
                                        console.log(getParentAPN.APN)
                                    }
                                    else if (getParentAPN.Parent_APN) {
                                        parentStringReject += ', ' + getParentAPN.Parent_APN;
                                    }
                                }
                            });

                            parentStringReject = $.unique(parentStringReject.split(', '));
                            parentStringReject = parentStringReject.join(', ');

                            $.each(resultListReject, function (index, object) {
                                let distDictTempUP = {};
                                $.each(object, function (key, value) {
                                    if (key === 'District_ID' || key === 'Elevator' || key === 'Levy' || key === 'Name' || key === 'MaxTax') {
                                        distDictTempUP[key] = value;
                                    }
                                });
                                distListReject.push(distDictTempUP)
                            });

                            function removeDuplicates(myArr, prop) {
                                return myArr.filter((obj, pos, arr) => {
                                    return arr.map(mapObj => mapObj[prop]).indexOf(obj[prop]) === pos;
                                });
                            }

                            function getSum(total, num) {
                                return total + num;
                            }

                            let getSumOfLevyList = [];
                            let tmpList = [];

                            let tmp;
                            // pushing levies to getSumOfLevyList so we can see if we need to ignore 0's or not
                            for (let i3 = 0; i3 < distListReject.length; i3++) {
                                getSumOfLevyList.push(distListReject[i3].Levy)
                            }

                            let sumOfLevies = getSumOfLevyList.reduce(getSum);

                            if (sumOfLevies !== 0) {
                                for (let i = 0; i < distListReject.length; i++) {
                                    let compareThis = distListReject[i].District_ID;
                                    tmp = distListReject[i].Levy;
                                    for (let i2 = 0; i2 < distListReject.length; i2++) {
                                        let disID1 = distListReject[i2].District_ID;
                                        let tmp2 = distListReject[i2].Levy;

                                        if (compareThis === disID1) {
                                            if (tmp !== 0 && tmp2 !== 0) {
                                                if (tmp < tmp2) {
                                                    distListReject[i].Levy = tmp;
                                                    //list.splice(i2, 1)
                                                    tmpList.push(distListReject[i]);
                                                    console.log(compareThis, disID1, tmp, tmp2, true)

                                                } else if (tmp === tmp2) {
                                                    tmpList.push(distListReject[i]);
                                                } else {
                                                    distListReject[i].Levy = tmp2;
                                                    //list.splice(i, 1)
                                                    tmpList.push(distListReject[i]);
                                                    console.log(compareThis, disID1, tmp, tmp2, true)
                                                }

                                            } else {
                                                tmpList.push(distListReject[i2]);
                                                console.log(compareThis, disID1, tmp, tmp2, false)
                                            }
                                        }
                                    }
                                }
                            } else {
                                for (let i = 0; i < distListReject.length; i++) {
                                    let compareThis = distListReject[i].District_ID;
                                    tmp = distListReject[i].Levy;
                                    for (let i2 = 0; i2 < distListReject.length; i2++) {
                                        let disID1 = distListReject[i2].District_ID;
                                        let tmp2 = distListReject[i2].Levy;

                                        if (compareThis === disID1) {
                                            if (tmp < tmp2) {
                                                distListReject[i].Levy = tmp;
                                                //list.splice(i2, 1)
                                                tmpList.push(distListReject[i]);
                                                console.log(compareThis, disID1, tmp, tmp2, true)

                                            } else if (tmp === tmp2) {
                                                tmpList.push(distListReject[i]);
                                            } else {
                                                distListReject[i].Levy = tmp2;
                                                //list.splice(i, 1)
                                                tmpList.push(distListReject[i]);
                                                console.log(compareThis, disID1, tmp, tmp2, true)
                                            }

                                        } else {
                                            tmpList.push(distListReject[i2]);
                                            console.log(compareThis, disID1, tmp, tmp2, false)
                                        }
                                    }
                                }
                            }

                            distListNoDupesReject = removeDuplicates(tmpList, 'District_ID');

                            taxGridReject.renderArray(distListNoDupesReject);

                            dgridReject.refresh();
                            dgridReject.renderArray(resultListReject);

                            $('#parentAPNUpdate').val(parentStringReject);
                            $('#gridTableReject, #addNewReject').show()
                        } else {
                            $('#noAPNReject').text(`APN # ${apnReject} WASN'T FOUND`).show();
                        }
                    });
                    gpFindParcelReject.getResultData(data.jobId, "Missing_APNs ").then(function (missingResults) {
                        $.each(missingResults.value, function (i, v) {
                            let missingString = "<li>" + v + "</li>";
                            $('#missingRejectList').append(missingString)
                        });
                        $('#missingAPNRejectList').show();
                        // $('#missingRejectList').val(missingString)
                    })
                })
            },

            _onBtnAddRejectClicked: function () {
                let newTextBoxDiv = $(document.createElement('input'))
                    .attr({
                        id: 'apnSearchValuerReject' + counter,
                        name: 'apnSearchValuerReject' + counter,
                        class: 'dijitTextBox',
                        type: 'text'
                    });

                $('#searchBoxesReject').find('br:last-child').remove();
                $('#searchBoxesReject').append("<br>");
                newTextBoxDiv.appendTo("#searchBoxesReject");

                counter++;
                console.log(counter)
            },

            _onBtnRemoveRejectClicked: function () {
                if (counter === 2) {
                    alert("No more textbox to remove");
                    return false;
                }

                counter--;
                $("#apnSearchValuerReject" + counter).remove();
                $('#searchBoxesReject').find('br:last-child').remove();
                console.log(counter)
            },

            _onBtnAddRejectValuesClicked: function () {
                let $newAPNFormUp = $('#addNewAPNReject');
                let newValuesUp = $newAPNFormUp.serializeArray();
                let fAPNUp = parseInt(newValuesUp[0].value);
                let lAPNUp = parseInt(newValuesUp[1].value);
                let $firstNewAPNUp = $('#firstNewAPNReject').val().trim();
                let $lastNewAPNUp = $('#lastAPNReject').val().trim();
                let checkDigitUp = '137913791';
                let apnPlusOneStringUp = null;
                let apnSingleDigitUp = null;
                let checkSingleDigitUp = null;
                let checkDigitMathUp = null;
                let checkDigitSumUp = null;
                let checkDigitArrayUp = null;

                if (distListNoDupesReject.length === 0 || !$firstNewAPNUp) {
                    if (distListNoDupesReject.length === 0) {
                        alert('Please add District info before adding records')
                    } else if (!$firstNewAPNUp) {
                        alert('Please add First APN')
                    }
                } else {
                    if (!$lastNewAPNUp) {
                        if ($firstNewAPNUp.length !== 9) {
                            alert('Please enter in 9 digits for First APN');
                        } else {
                            checkDigitArrayUp = [];
                            let singleAPNObjUp = {};
                            $(newValuesUp).each(function (i, field) {
                                if (field.name === 'fAPN') {
                                    singleAPNObjUp['APN'] = field.value;
                                } else if (field.name === 'Parent_APN') {
                                    singleAPNObjUp[field.name] = field.value
                                }
                            });

                            apnPlusOneStringUp = singleAPNObjUp.APN;
                            for (let i = 0; i < apnPlusOneStringUp.length; i++) {
                                apnSingleDigitUp = parseInt(apnPlusOneStringUp[i]);
                                checkSingleDigitUp = parseInt(checkDigitUp[i]);
                                checkDigitMathUp = apnSingleDigitUp * checkSingleDigitUp;
                                checkDigitArrayUp.push(checkDigitMathUp)
                            }
                            checkDigitSumUp = checkDigitArrayUp.reduce((x, y) => x + y).toString();
                            singleAPNObjUp.APN = apnPlusOneStringUp + '-' + checkDigitSumUp.slice(-1);
                            childrenSearchArrayReject.push(singleAPNObjUp.APN);
                            newListedAPNsReject.push(singleAPNObjUp);

                            $newAPNFormUp[0].reset();
                            $('#parentAPNUpdate').val(parentStringReject);

                            $(distListNoDupesReject).each(function (i2, fields2) {
                                $(newListedAPNsReject).each(function (i3, fields3) {
                                    let finalObjUp = {};
                                    finalObjUp = $.extend({}, fields3, fields2);
                                    finalListReject.push(finalObjUp);
                                })
                            });
                            let finalCount = finalListReject.length;
                            console.log(finalListReject);
                            finalGridReject.renderArray(finalListReject);
                            $('#gridFinalReject').show();
                            $('#FinalCount').text('# of Parcels being added: ' + finalCount);
                            newListedAPNsReject = [];
                            //distListNoDupesReject = null
                        }
                    } else {
                        if ($firstNewAPNUp.length !== 9 || $lastNewAPNUp.length !== 9) {
                            alert('Please enter in a 9 digit APN for First/ Last');
                        } else {
                            for (let apnPlusOneInt = fAPNUp; apnPlusOneInt <= lAPNUp; ++apnPlusOneInt) {
                                let newObjAPNsUp = {};
                                checkDigitArrayUp = [];
                                $(newValuesUp).each(function (i, field) {
                                    if (field.name === 'fAPN') {
                                        newObjAPNsUp['APN'] = field.value;
                                    } else if (field.name === 'Parent_APN') {
                                        newObjAPNsUp[field.name] = field.value
                                    }
                                });
                                apnPlusOneStringUp = apnPlusOneInt.toString();
                                for (let i = 0; i < apnPlusOneStringUp.length; i++) {
                                    apnSingleDigitUp = parseInt(apnPlusOneStringUp[i]);
                                    checkSingleDigitUp = parseInt(checkDigitUp[i]);
                                    checkDigitMathUp = apnSingleDigitUp * checkSingleDigitUp;
                                    checkDigitArrayUp.push(checkDigitMathUp)
                                }

                                checkDigitSumUp = checkDigitArrayUp.reduce((x, y) => x + y).toString();
                                newObjAPNsUp.APN = apnPlusOneStringUp + '-' + checkDigitSumUp.slice(-1);
                                childrenSearchArrayReject.push(newObjAPNsUp.APN);
                                newListedAPNsReject.push(newObjAPNsUp);
                            }
                            $newAPNFormUp[0].reset();
                            $('#parentAPNUpdate').val(parentStringReject);

                            $(distListNoDupesReject).each(function (i2, fields2) {
                                $(newListedAPNsReject).each(function (i3, fields3) {
                                    let finalObjUp = {};
                                    finalObjUp = $.extend({}, fields3, fields2);
                                    finalListReject.push(finalObjUp);
                                })
                            });
                            let finalCount = finalListReject.length;
                            $('#FinalCount').text('# of Parcels being added: ' + finalCount);
                            console.log(finalListReject);
                            finalGridReject.renderArray(finalListReject);
                            $('#gridFinalReject').show();
                            newListedAPNsReject = [];
                            //distListNoDupesReject = null
                        }
                    }
                }
            },

            _onBtnAddDisRejectClicked: function () {
                let newObjDistUp = {};
                let disIDUp = $('#districtIDReject').val();
                let csaNameUp = $('#csaNamesReject').val();
                let elevUp = $('#elevatorReject').val();
                let levyUp = $('#levyReject').val();
                let maxTUp = $('#maxTaxReject').val();

                if (!csaNameUp) {
                    alert('CSA Name is not provided. Please choose a district.')
                } else {
                    newObjDistUp['District_ID'] = disIDUp;
                    newObjDistUp['Name'] = csaNameUp;
                    newObjDistUp['Elevator'] = elevUp;
                    newObjDistUp['Levy'] = levyUp;
                    newObjDistUp['MaxTax'] = maxTUp;
                    distListNoDupesReject.push(newObjDistUp);

                    taxGridReject.renderArray(distListNoDupesReject)
                }

                $('#districtIDReject, #elevatorReject, #levyReject, #csaNamesReject, #maxTaxReject').val('');
            },

            _onBtnResetDisRejectClicked: function () {
                distListNoDupesReject = [];
                $('#districtIDReject, #elevatorReject, #levyReject, #csaNamesReject, #maxTaxReject').val('');
                taxGridReject.refresh();
            },

            _onBtnSaveRejectsClicked: function () {
                function onlyUnique(value, index, self) {
                    return self.indexOf(value) === index;
                }

                gpFindParcelReject.submitJob({Update_APN: childrenSearchArrayReject}).then(function (childrenData) {
                    gpFindParcelReject.getResultData(childrenData.jobId, "Result").then(function (childrenJsonResults) {
                        let childrenResults = childrenJsonResults.value;
                        let childrenAPN = [];

                        $.each(childrenResults, function (index, jsonData) {
                            let parsedChildren = $.parseJSON(jsonData);
                            childrenAPN.push(parsedChildren.APN)
                        });

                        let uniqueChildren = childrenAPN.filter(onlyUnique);

                        if (childrenResults.length > 0) {
                            console.log(finalListReject);
                            if (confirm(`Children APNs have been found\n\n\t${uniqueChildren}\n\nWould you like to update these existing APNs?`)) {
                                gpAddParcelReject.submitJob({
                                    Parent_APN: searchArrayReject,
                                    New_APNs: JSON.stringify(finalListReject),
                                    True_False: 'true'
                                }).then(function (submitData) {
                                    console.log(submitData);

                                    if (submitData.jobStatus === 'esriJobSucceeded') {
                                        alert('SUCCESS: APN(s) have been submitted');
                                        newListedAPNsReject = [];
                                        finalListReject = [];
                                        distListReject = [];
                                        childrenSearchArrayReject = [];
                                        $('#searchRejectAPN').show();
                                        $('#addNewReject, #gridTableReject, #noAPNReject, #gridFinalReject').hide();
                                        $('#missingRejectList').empty();

                                        parentStringReject = '';
                                        finalGridReject.refresh();
                                        taxGridReject.refresh();

                                        $('#searchBoxesReject br').remove();
                                        $('#searchBoxesReject>input').slice(1).remove();
                                        $('#apnSearchValuerReject1').val('')
                                    } else if (submitData.jobStatus === 'esriJobFailed ') {
                                        alert('FAILED: APN(s) have not been submitted')
                                    }
                                })
                            }
                        } else {
                            gpAddParcelReject.submitJob({
                                Parent_APN: searchArrayReject,
                                New_APNs: JSON.stringify(finalListReject),
                                True_False: 'false'
                            }).then(function (submitData) {
                                console.log(submitData);

                                if (submitData.jobStatus === 'esriJobSucceeded') {
                                    alert('SUCCESS: APN(s) have been submitted');
                                    newListedAPNsReject = [];
                                    finalListReject = [];
                                    distListReject = [];
                                    childrenSearchArrayReject = [];
                                    $('#searchRejectAPN').show();
                                    $('#addNewReject, #gridTableReject, #noAPNReject, #gridFinalReject').hide();
                                    $('#missingRejectList').empty();

                                    parentStringReject = '';
                                    finalGridReject.refresh();
                                    taxGridReject.refresh();

                                    $('#searchBoxesReject br').remove();
                                    $('#searchBoxesReject>input').slice(1).remove();
                                    $('#apnSearchValuerReject1').val('')
                                } else if (submitData.jobStatus === 'esriJobFailed ') {
                                    alert('FAILED: APN(s) have not been submitted')
                                }
                            })
                        }
                    })
                });
            },

            _onBtnResetEverythingRejectClicked: function () {
                newListedAPNsReject = [];
                finalListReject = [];
                distListReject = [];
                parentStringReject = '';
                dgridReject.refresh();
                taxGridReject.refresh();
                finalGridReject.refresh();

                $('#searchBoxesReject br').remove();
                $('#missingRejectList').empty();
                $('#addNewAPNReject')[0].reset();
                $('#gridFinalReject').hide();
                $('#missingAPNRejectList').hide();
                $('#searchBoxesReject>input').slice(1).remove();
                $('#apnSearchValuerReject1').val('')
            },

            _onRejectChange: function (event) {
                let idUp = $('#csaNamesReject').val();
                let nameUp = csaValuesReject[idUp] || [];
                $('#districtIDReject').val(nameUp);
            }
        });
    });