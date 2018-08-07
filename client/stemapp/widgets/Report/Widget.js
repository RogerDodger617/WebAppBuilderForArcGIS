define(['dojo/_base/declare',
        'jimu/BaseWidget',
        'esri/tasks/Geoprocessor',
        'jimu/dijit/Report',
        'jimu/dijit/PageUtils',
        "esri/dijit/util/busyIndicator",
        "widgets/jszip/jszip"
    ],
    function (declare, BaseWidget, Geoprocessor, Report, PageUtils, busyIndicator, jszip) {
        //To create a widget, you need to derive from BaseWidget.
        return declare([BaseWidget], {
            // DemoWidget code goes here

            //please note that this property is be set by the framework when widget is loaded.
            //templateString: template,

            baseClass: 'jimu-widget-report',
            report: null,
            today: null,
            dd: null,
            mm: null,
            yyyy: null,
            monthNames: null,
            currentMonth: null,

            postCreate: function () {
                this.inherited(arguments);
                console.log('postCreate');
            },

            startup: function () {
                this.inherited(arguments);

                monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September",
                    "October", "November", "December"
                ];

                today = new Date();
                dd = today.getDate();
                mm = today.getMonth() + 1;
                yyyy = today.getFullYear();
                currentMonth = monthNames[mm - 1];

                if (dd < 10) {
                    dd = '0' + dd
                }
                if (mm < 10) {
                    mm = '0' + mm
                }

                today = yyyy + '-' + mm + '-' + dd;
                gpGeneratedReport = new Geoprocessor(
                    'https://rcagapd01.rivcoca.org:6443/arcgis/rest/services/EDA/GenerateReport/GPServer/Generate%20Report');
                report = new Report({
                    printTaskUrl: "https://rcagapd01.rivcoca.org:6443/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task",
                    reportLogo: "https://preview.ibb.co/emP9qy/EDA_header.png",
                    reportLayout: {
                        "pageSize": PageUtils.PageSizes.A4,
                        "orientation": PageUtils.Orientation.Portrait
                    }
                });
                console.log('startup');
            },

            _onBtnPrintClicked: function () {
                let zip = new jszip();
                let handle = busyIndicator.create('main-page');
                handle.show();
                let iCount = 0;
                let searchArray = [];
                $.each($('#rangeDates').serializeArray(), function (i, field) {
                    if (field.value === '') {
                        iCount++;
                        searchArray.push(field.value)
                    } else {
                        if (field.value === today){
                            today1 = yyyy + '-' + mm + '-' + (parseInt(dd) + 1);
                            searchArray.push(today1)
                        } else {
                            searchArray.push(field.value)
                        }
                    }
                });

                if (iCount === 2) {
                    searchArray = [];
                    searchArray.push('ALL')
                }
                console.log(searchArray);

                gpGeneratedReport.submitJob({Value: searchArray}).then(function (data) {
                    console.log(data);
                    if (data.jobStatus === "esriJobFailed") {
                        handle.hide();
                        alert('Generate Report Failed. Please try again.')
                    } else {
                        gpGeneratedReport.getResultData(data.jobId, 'APN_List').then(function (jsonResults) {
                            let resultsUp = jsonResults.value;
                            let totalParcels = [];
                            let totalChargers = [];
                            const reducer = (accumulater, currentValue) => accumulater + currentValue;

                            $.each(resultsUp, function (index, value) {
                                totalParcels.push(parseInt(value[2]));
                                totalChargers.push(Number(value[3].replace(/[^0-9\.-]+/g, "")))
                            });

                            let sumOfParcels = totalParcels.reduce(reducer);
                            sumOfParcels = sumOfParcels.toLocaleString();
                            let sumOfCharges = totalChargers.reduce(reducer);
                            sumOfCharges = sumOfCharges.toLocaleString('en-us', {style: 'currency', currency: 'USD'})

                            let printData = [
                                {
                                    type: "html",
                                    data: `<p style="text-align: center;">${currentMonth} ${dd}, ${yyyy}</p>
                               <p>Riverside County Auditor-Controller's Office<br />
                               Property Tax Division<br />
                               4080 Lemon Street, 11<sup>th</sup>&nbsp;Floor<br />
                               Riverside, CA 92502</p> 
                               <p>RE:&nbsp; &nbsp;FY ${yyyy}-${yyyy} Fixed Charges submittal:<br />
                               &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;Riverside County Economic Development Agency</p>
                               <p>Attached for your reference, is a letter representing the Agency, District, Fund Number, 
                               Parcel Count, and Total Charges, applied to the County's FTP site for Fiscal Year ${yyyy}-${yyyy + 1}
                               Fixed Charges.</p>`
                                },
                                {
                                    addPageBreak: false,
                                    type: "table",
                                    tableCols: 4,
                                    data: {
                                        showRowIndex: false,
                                        rows: resultsUp,
                                        cols: ["Fund Number", "Description", "Total Assessments", "Total Charges"]
                                    }
                                },
                                {
                                    type: "html",
                                    data: `<p><span style="text-decoration: underline;"><strong>Totals:</strong></span></p>
                                <ul>
                                <li><strong>Sum of Total Assessments: ${sumOfParcels}</strong></li>
                                <li><strong>Sum of Total Chargers: ${sumOfCharges}</strong></li>
                                </ul>`
                                },
                                {
                                    type: "html",
                                    data: `<p>If you have any questions or problems with our submittal please feel free to contact:
                                <br /><br /><br />
                                (Office Information)<br />
                                County of Riverside<br />
                                Office of the Auditor-Controller<br />
                                4080 Lemon Street, 11th Fl.<br />
                                Riverside, CA 92502-1326<br />
                                951-955-3212<br />
                                lzarate@rivco.org <br /><br /><br />
                                Please contact us when the accepted and rejected reports are available.<br /><br /><br />
                                Sincerely,<br />
                                EDA<br /><br />
                                <br /><br />
                                Leni Zarate<br />
                                Administrative Services Manager <span>&#8545;</span></p>`
                                }];
                            report.print("COUNTY OF RIVERSIDE EDA", printData);
                            handle.hide();
                        });
                        gpGeneratedReport.getResultData(data.jobId, 'APN_Dict').then(function (jsonDictResults) {
                            let resultDict = jsonDictResults.value;
                            
                            $.each(resultDict, function (i , v) {
                                let apnNumber = i;
                                let parcelInfo = v;
                                parcelInfo = parcelInfo.join('');
                                parcelInfo = parcelInfo.replace(/<br\s*[\/]?>/gi, "\r\n");

                                zip.file(apnNumber + '.txt', parcelInfo);
                            });
                            zip.generateAsync({type: "blob"}).then(function (blob) {
                                saveAs(blob, "APNs_"+ mm + "" + dd + "" + yyyy + ".zip")
                            }, function (err) {
                                console.error(err)
                            });
                        })
                    }
                });
            },

            _onBtnEverything: function () {
                $('#genReport, #btn').show();
                $('#dateRange').hide();
                $('#startDate, #endDate').val('')
            },

            _onBtnSpecificRange: function () {
                $('#startDate, #endDate').attr('max', today);
                $('#endDate').val(today);

                $('#genReport, #dateRange, #btn').show();
            }
        });
    });