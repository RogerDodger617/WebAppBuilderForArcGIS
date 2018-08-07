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
        //To create a widget, you need to derive from BaseWidget.
        return declare([BaseWidget], {
            // DemoWidget code goes here

            //please note that this property is be set by the framework when widget is loaded.
            //templateString: template,

            baseClass: 'jimu-widget-findandaddparcels',
            apn: null,
            dgrid: null,
            newListedAPNs: null,
            csaValues: null,
            distList: null,
            finalList: null,
            searchResultList: null,

            startup: function () {
                this.inherited(arguments);
                gpFindParcel = new Geoprocessor(
                    "https://rcagapd01.rivcoca.org:6443/arcgis/rest/services/EDA/FindParcel/GPServer/Find%20Parcel");
                gpAddParcel = new Geoprocessor(
                    "https://rcagapd01.rivcoca.org:6443/arcgis/rest/services/EDA/AddNewParcel/GPServer/Add%20New%20Parcel");

                let columns = [
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
                let finalColumns = [
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
                let taxColumns = [
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

                dgrid = new (declare([Grid, ColumnResizer, ColumnHider]))({columns: columns}, 'grid');
                taxGrid = new (declare([Grid, ColumnResizer, Keyboard, Selection, Editor]))({columns: taxColumns}, 'taxGrid');
                finalGrid = new (declare([Grid, ColumnResizer]))({columns: finalColumns}, 'finalGrid');

                newListedAPNs = [];
                distList = [];
                finalList = [];

                $("#existAPN").prop("checked", true);
                $("#multipleAPNs").prop("checked", true);

                csaValues = {
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

                $.each(csaValues, function (key, value) {
                    $('#csaName').append("<option value='" + key + "'>")
                });
            },

            _onRadioClicked: function () {
                let radioValue = $('input[name="radiobtn"]:checked').val();

                if (radioValue === 'new') {
                    apn = '';
                    newListedAPNs = [];
                    finalList = [];
                    distList = [];
                    $('#addNew').show();
                    $('#addNewAPN')[0].reset();
                    $('#searchAPN')[0].reset();
                    $('#searchAPN, #gridTable, #noAPN, #gridFinal').hide();
                    finalGrid.refresh();
                    taxGrid.refresh();
                } else if (radioValue === 'exist') {
                    newListedAPNs = [];
                    finalList = [];
                    distList = [];
                    $('#addNewAPN')[0].reset();
                    $('#searchAPN').show();
                    $('#addNew, #gridTable, #noAPN, #gridFinal').hide();
                    finalGrid.refresh();
                    taxGrid.refresh();
                }
            },

            _onRangeClicked: function () {
                let radioRangebtn = $('input[name="radioRangebtn"]:checked').val();

                if (radioRangebtn === 'range') {
                    $('#lastAPN').css("background-color", "#DEDEDE").prop('readonly', true)
                } else {
                    $('#lastAPN').css("background-color", "white").prop('readonly', false)
                }
            },

            _onBtnSearchClicked: function () {
                apn = $('#apnSearchValue').val();

                $('#gridTable, #noAPN, #addNew').hide();
                $('#districtID, #elevator, #levy, #csaNames, #maxTax').val('');
                distList = [];
                taxGrid.refresh();

                gpFindParcel.submitJob({APN: apn}).then(function (data) {
                    gpFindParcel.getResultData(data.jobId, "Result").then(function (jsonResults) {
                        let results = jsonResults.value;
                        searchResultList = [];

                        if (typeof results !== 'undefined' && results.length > 0) {
                            $.each(results, function (json) {
                                let parsedJsonResults = $.parseJSON(results[json]);
                                searchResultList.push(parsedJsonResults)
                            });
                            dgrid.refresh();
                            dgrid.renderArray(searchResultList);

                            $.each(searchResultList, function (index, object) {
                                let distDictTemp = {};
                                $.each(object, function (key, value) {
                                    if (key === 'District_ID' || key === 'Elevator' || key === 'Levy' || key === 'Name' || key === 'MaxTax') {
                                        distDictTemp[key] = value;
                                    }
                                });
                                distList.push(distDictTemp)
                            });
                            taxGrid.renderArray(distList);

                            $('#parentAPN').val(apn);
                            $('#gridTable, #addNew').show()
                        } else {
                            $('#noAPN').text(`APN # ${apn} WASN'T FOUND`).show();
                        }
                    })
                })
            },

            _onBtnAddRecordClicked: function () {
                let $newAPNForm = $('#addNewAPN');
                let newValues = $newAPNForm.serializeArray();
                let fAPN = parseInt(newValues[0].value);
                let lAPN = parseInt(newValues[1].value);
                let $firstNewAPN = $('#firstNewAPN').val().trim();
                let $lastNewAPN = $('#lastAPN').val().trim();
                let checkDigit = '137913791';
                let apnPlusOneString = null;
                let apnSingleDigit = null;
                let checkSingleDigit = null;
                let checkDigitMath = null;
                let checkDigitSum = null;
                let checkDigitArray = null;

                if (distList.length === 0 || !$firstNewAPN) {
                    if (distList.length === 0) {
                        alert('Please add District info before adding records')
                    } else if (!$firstNewAPN) {
                        alert('Please add First APN')
                    }
                } else {
                    if (!$lastNewAPN) {
                        if ($firstNewAPN.length !== 9) {
                            alert('Please enter in 9 digits for First APN');
                        } else {
                            checkDigitArray = [];
                            let singleAPNObj = {};
                            $(newValues).each(function (i, field) {
                                if (field.name === 'fAPN') {
                                    singleAPNObj['APN'] = field.value;
                                } else if (field.name === 'Parent_APN') {
                                    singleAPNObj[field.name] = field.value
                                }
                            });

                            apnPlusOneString = singleAPNObj.APN;
                            for (let i = 0; i < apnPlusOneString.length; i++) {
                                apnSingleDigit = parseInt(apnPlusOneString[i]);
                                checkSingleDigit = parseInt(checkDigit[i]);
                                checkDigitMath = apnSingleDigit * checkSingleDigit;
                                checkDigitArray.push(checkDigitMath)
                            }
                            checkDigitSum = checkDigitArray.reduce((x, y) => x + y).toString();
                            singleAPNObj.APN = apnPlusOneString + '-' + checkDigitSum.slice(-1);
                            newListedAPNs.push(singleAPNObj);

                            $newAPNForm[0].reset();
                            $('#parentAPN').val(apn);

                            $(distList).each(function (i2, fields2) {
                                $(newListedAPNs).each(function (i3, fields3) {
                                    let finalObj = {};
                                    finalObj = $.extend({}, fields3, fields2);
                                    finalList.push(finalObj);
                                })
                            });
                            console.log(finalList);
                            finalGrid.renderArray(finalList);
                            $('#gridFinal').show();
                            newListedAPNs = [];
                            distList = []
                        }
                    } else {
                        if ($firstNewAPN.length !== 9 || $lastNewAPN.length !== 9) {
                            alert('Please enter in a 9 digit APN for First/ Last');
                        } else {
                            for (let apnPlusOneInt = fAPN; apnPlusOneInt <= lAPN; ++apnPlusOneInt) {
                                let newObjAPNs = {};
                                checkDigitArray = [];
                                $(newValues).each(function (i, field) {
                                    if (field.name === 'fAPN') {
                                        newObjAPNs['APN'] = field.value;
                                    } else if (field.name === 'Parent_APN') {
                                        newObjAPNs[field.name] = field.value
                                    }
                                });
                                apnPlusOneString = apnPlusOneInt.toString();
                                for (let i = 0; i < apnPlusOneString.length; i++) {
                                    apnSingleDigit = parseInt(apnPlusOneString[i]);
                                    checkSingleDigit = parseInt(checkDigit[i]);
                                    checkDigitMath = apnSingleDigit * checkSingleDigit;
                                    checkDigitArray.push(checkDigitMath)
                                }

                                checkDigitSum = checkDigitArray.reduce((x, y) => x + y).toString();
                                newObjAPNs.APN = apnPlusOneString + '-' + checkDigitSum.slice(-1);
                                newListedAPNs.push(newObjAPNs);
                            }
                            $newAPNForm[0].reset();
                            $('#parentAPN').val(apn);

                            $(distList).each(function (i2, fields2) {
                                $(newListedAPNs).each(function (i3, fields3) {
                                    let finalObj = {};
                                    finalObj = $.extend({}, fields3, fields2);
                                    finalList.push(finalObj);
                                })
                            });
                            console.log(finalList);
                            finalGrid.renderArray(finalList);
                            $('#gridFinal').show();
                            newListedAPNs = [];
                            distList = []
                        }
                    }
                }
            },

            _onBtnAddDisValuesClicked: function () {
                let newObjDist = {};
                let disID = $('#districtID').val();
                let csaName = $('#csaNames').val();
                let elev = $('#elevator').val();
                let levy = $('#levy').val();
                let maxT = $('#maxTax').val();

                if (!csaName) {
                    alert('CSA Name is not provided. Please choose a district.')
                } else {
                    newObjDist['District_ID'] = disID;
                    newObjDist['Name'] = csaName;
                    newObjDist['Elevator'] = elev;
                    newObjDist['Levy'] = levy;
                    newObjDist['MaxTax'] = maxT;
                    distList.push(newObjDist);

                    console.log(distList)

                    taxGrid.renderArray(distList)
                }
            },

            _onBtnResetDisValuesClicked: function () {
                distList = [];
                $('#districtID, #elevator, #levy, #csaNames, #maxTax').val('');
                taxGrid.refresh();
            },

            _onBtnSaveRecordsClicked: function () {
                gpAddParcel.submitJob({
                    Parent_APN: apn,
                    New_APNs: JSON.stringify(finalList)
                }).then(function (submitData) {
                    console.log(submitData);

                    if (submitData.jobStatus === 'esriJobSucceeded') {
                        alert('SUCCESS: APN(s) have been submitted');
                        newListedAPNs = [];
                        finalList = [];
                        distList = [];
                        $('#searchAPN').show();
                        $('#addNew, #gridTable, #noAPN, #gridFinal').hide();
                        finalGrid.refresh();
                        taxGrid.refresh();

                        $("#existAPN").prop("checked", true);
                        $('#apnSearchValue').val('');
                    } else if (submitData.jobStatus === 'esriJobFailed ') {
                        alert('FAILED: APN(s) have not been submitted')
                    }
                })
            },

            _onBtnResetEverythingClicked: function () {
                newListedAPNs = [];
                finalList = [];
                distList = [];
                taxGrid.refresh();
                finalGrid.refresh();

                $('#gridFinal').hide()
            },

            _onChange: function (event) {
                let id = $('#csaNames').val();
                let name = csaValues[id] || [];
                $('#districtID').val(name);
            }
        });
    });