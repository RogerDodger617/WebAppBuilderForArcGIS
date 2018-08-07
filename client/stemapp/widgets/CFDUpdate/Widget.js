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

            baseClass: 'jimu-widget-CFDUpdate',
            apnUp: null,
            dgridUp: null,
            newListedAPNsUp: null,
            parentString: null,
            csaValuesUp: null,
            distListUp: null,
            finalListUp: null,
            searchArray: null,

            startup: function () {
                this.inherited(arguments);
                gpFindParcelUp = new Geoprocessor(
                    "http://clgcityworks.lemongrove.ca.gov/clgegis/rest/services/MSTest/UpdateFindParcel/GPServer/Update%20Find%20Parcel");
                gpAddParcelUp = new Geoprocessor(
                    "http://clgcityworks.lemongrove.ca.gov/clgegis/rest/services/MSTest/UpdateNewParcel/GPServer/Update%20New%20Parcel");

                let columnsUp = [
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
                let finalColumnsUp = [
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
                let taxColumnsUp = [
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

                dgridUp = new (declare([Grid, ColumnResizer, ColumnHider]))({columns: columnsUp}, 'gridUpdate');
                taxGridUp = new (declare([Grid, ColumnResizer, Keyboard, Selection, Editor]))({columns: taxColumnsUp}, 'taxGridUpdate');
                finalGridUp = new (declare([Grid, ColumnResizer]))({columns: finalColumnsUp}, 'finalGridUpdate');

                newListedAPNsUp = [];
                parentString = '';
                distListUp = [];
                finalListUp = [];

                $("#existUpdateAPN").prop("checked", true);
                $("#multipleAPNsUpdate").prop("checked", true);

                csaValuesUp = {
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

                $.each(csaValuesUp, function (key, value) {
                    $('#csaNameUpdate').append("<option value='" + key + "'>")
                });
            },

            _onRangeClicked: function () {
                let radioRangeBtnUp = $('input[name="radioRangeBtnUpdate"]:checked').val();

                if (radioRangeBtnUp === 'range') {
                    $('#lastAPNUpdate').css("background-color", "#DEDEDE").prop('readonly', true)
                } else {
                    $('#lastAPNUpdate').css("background-color", "white").prop('readonly', false)
                }
            },

            _onBtnSearchClickedUpdated: function () {
                searchArray = [];
                $.each($('#searchUpdateAPN').serializeArray(), function (i, field) {
                    searchArray.push(field.value)
                });
                console.log(searchArray);

                apnUp = $('#apnSearchValueUpdate').val();
                $('#gridTableUpdate, #noAPNUpdate, #addNewUpdate').hide();
                gpFindParcelUp.submitJob({Update_APN: searchArray}).then(function (data) {
                    gpFindParcelUp.getResultData(data.jobId, "Result").then(function (jsonResults) {
                        let resultsUp = jsonResults.value;
                        let resultListUp = [];

                        if (typeof resultsUp !== 'undefined' && resultsUp.length > 0) {
                            $.each(resultsUp, function (json) {
                                let parsedJsonResults = $.parseJSON(resultsUp[json]);
                                resultListUp.push(parsedJsonResults)
                            });

                            $.each(resultListUp, function (i, getParentAPN) {
                                if (!parentString) {
                                    if (getParentAPN.Parent_APN) {
                                        parentString += getParentAPN.Parent_APN;
                                    }
                                    else if (!getParentAPN.Parent_APN || getParentAPN.Parent_APN !== 'null') {
                                        console.log(getParentAPN.Parent_APN)
                                    }
                                } else {
                                    if (getParentAPN.Parent_APN) {
                                        parentString += ', ' + getParentAPN.Parent_APN;
                                    }
                                    else if (!getParentAPN.Parent_APN || getParentAPN.Parent_APN !== 'null') {
                                        console.log(getParentAPN.Parent_APN)
                                    }
                                }
                            });

                            parentString = $.unique(parentString.split(', '));
                            parentString = parentString.join(', ');

                            dgridUp.refresh();
                            dgridUp.renderArray(resultListUp);

                            $('#parentAPNUpdate').val(parentString);
                            $('#gridTableUpdate, #addNewUpdate').show()
                        } else {
                            $('#noAPNUpdate').text(`APN # ${apnUp} WASN'T FOUND`).show();
                        }
                    })
                })
            },

            _onBtnAddValueClicked: function () {
                let newTextBoxDiv = $(document.createElement('input'))
                    .attr({
                        id: 'apnSearchValueUpdate' + counter,
                        name: 'apnSearchValueUpdate' + counter,
                        class: 'dijitTextBox',
                        type: 'text'
                    });

                $('#searchBoxes').find('br:last-child').remove();
                $('#searchBoxes').append("<br>");
                newTextBoxDiv.appendTo("#searchBoxes");

                counter++;
                console.log(counter)
            },

            _onBtnRemoveValueClicked: function () {
                if (counter === 2) {
                    alert("No more textbox to remove");
                    return false;
                }

                counter--;
                $("#apnSearchValueUpdate" + counter).remove();
                $('#searchBoxes').find('br:last-child').remove();
                console.log(counter)
            },

            _onBtnAddRecordClicked: function () {
                let $newAPNFormUp = $('#addNewAPNUpdate');
                let newValuesUp = $newAPNFormUp.serializeArray();
                let fAPNUp = parseInt(newValuesUp[0].value);
                let lAPNUp = parseInt(newValuesUp[1].value);
                let $firstNewAPNUp = $('#firstNewAPNUpdate').val().trim();
                let $lastNewAPNUp = $('#lastAPNUpdate').val().trim();
                let checkDigitUp = '137913791';
                let apnPlusOneStringUp = null;
                let apnSingleDigitUp = null;
                let checkSingleDigitUp = null;
                let checkDigitMathUp = null;
                let checkDigitSumUp = null;
                let checkDigitArrayUp = null;

                if (distListUp.length === 0 || !$firstNewAPNUp) {
                    if (distListUp.length === 0) {
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
                            newListedAPNsUp.push(singleAPNObjUp);

                            $newAPNFormUp[0].reset();
                            $('#parentAPNUpdate').val(parentString);

                            $(distListUp).each(function (i2, fields2) {
                                $(newListedAPNsUp).each(function (i3, fields3) {
                                    let finalObjUp = {};
                                    finalObjUp = $.extend({}, fields3, fields2);
                                    finalListUp.push(finalObjUp);
                                })
                            });
                            console.log(finalListUp);
                            finalGridUp.renderArray(finalListUp);
                            $('#gridFinalUpdate').show();
                            newListedAPNsUp = [];
                            distListUp = []
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
                                newListedAPNsUp.push(newObjAPNsUp);
                            }
                            $newAPNFormUp[0].reset();
                            $('#parentAPNUpdate').val(parentString);

                            $(distListUp).each(function (i2, fields2) {
                                $(newListedAPNsUp).each(function (i3, fields3) {
                                    let finalObjUp = {};
                                    finalObjUp = $.extend({}, fields3, fields2);
                                    finalListUp.push(finalObjUp);
                                })
                            });
                            console.log(finalListUp);
                            finalGridUp.renderArray(finalListUp);
                            $('#gridFinalUpdate').show();
                            newListedAPNsUp = [];
                            distListUp = []
                        }
                    }
                }
            },

            _onBtnAddDisValuesClicked: function () {
                let newObjDistUp = {};
                let disIDUp = $('#districtIDUpdate').val();
                let csaNameUp = $('#csaNamesUpdate').val();
                let elevUp = $('#elevatorUpdate').val();
                let levyUp = $('#levyUpdate').val();
                let maxTUp = $('#maxTaxUpdate').val();

                if (!csaNameUp) {
                    alert('CSA Name is not provided. Please choose a district.')
                } else {
                    newObjDistUp['District_ID'] = disIDUp;
                    newObjDistUp['Name'] = csaNameUp;
                    newObjDistUp['Elevator'] = elevUp;
                    newObjDistUp['Levy'] = levyUp;
                    newObjDistUp['MaxTax'] = maxTUp;
                    distListUp.push(newObjDistUp);

                    taxGridUp.renderArray(distListUp)
                }
            },

            _onBtnResetDisValuesClicked: function () {
                distListUp = [];
                $('#districtIDUpdate, #elevatorUpdate, #levyUpdate, #csaNamesUpdate, #maxTaxUpdate').val('');
                taxGridUp.refresh();
            },

            _onBtnSaveRecordsClicked: function () {
                gpAddParcelUp.submitJob({
                    Parent_APN: searchArray,
                    New_APNs: JSON.stringify(finalListUp)
                }).then(function (submitData) {
                    console.log(submitData);

                    if (submitData.jobStatus === 'esriJobSucceeded') {
                        alert('SUCCESS: APN(s) have been submitted');
                        newListedAPNsUp = [];
                        finalListUp = [];
                        distListUp = [];
                        $('#searchUpdateAPN').show();
                        $('#addNewUpdate, #gridTableUpdate, #noAPNUpdate, #gridFinalUpdate').hide();
                        finalGridUp.refresh();
                        taxGridUp.refresh();

                        $('#searchBoxes>input').slice(1).remove();
                        $('#apnSearchValueUpdate1').val('')
                    } else if (submitData.jobStatus === 'esriJobFailed ') {
                        alert('FAILED: APN(s) have not been submitted')
                    }
                })
            },

            _onBtnResetEverythingClicked: function () {
                newListedAPNsUp = [];
                finalListUp = [];
                distListUp = [];
                parentString = '';
                dgridUp.refresh();
                taxGridUp.refresh();
                finalGridUp.refresh();

                $('#addNewAPNUpdate')[0].reset();
                $('#gridFinalUpdate').hide();
                $('#searchBoxes>input').slice(1).remove();
                $('#apnSearchValueUpdate1').val('')
            },

            _onChange: function (event) {
                let idUp = $('#csaNamesUpdate').val();
                let nameUp = csaValuesUp[idUp] || [];
                $('#districtIDUpdate').val(nameUp);
            }
        });
    });