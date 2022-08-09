//------------------------------------------------------------------------------
//Socket IO
//------------------------------------------------------------------------------
let socket = io();
//------------------------------------------------------------------------------
//Additional functions
//------------------------------------------------------------------------------
function formatFileSize(bytes,decimalPoint) {
   if(bytes == 0) return '0 Bytes';
   var k = 1000,
       dm = decimalPoint || 2,
       sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
       i = Math.floor(Math.log(bytes) / Math.log(k));
   return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
function secondsToHms(d) {
    d = Number(d);
    var h = Math.floor(d / 3600);
    var m = Math.floor(d % 3600 / 60);
    var s = Math.floor(d % 3600 % 60);

    var hDisplay = h > 0 ? h + (h == 1 ? " h, " : " hs, ") : "";
    var mDisplay = m > 0 ? m + (m == 1 ? " m, " : " ms, ") : "";
    var sDisplay = s > 0 ? s + (s == 1 ? " s" : " ss") : "";
    return hDisplay + mDisplay + sDisplay;
}

$(document).ready(() => {
  $("input[name='updateTiles']").on("click", () => {
    if($("input[name='updateTiles']").is(":checked")) {
      $("input[name='updateDifferent']").attr("disabled", false);
      $("input[name='updateDateTile']").attr("disabled", false);
      $("input[name='dateTile']").attr("disabled", false);
    }
    else {
      $("input[name='updateDifferent']").attr("disabled", true);
      $("input[name='updateDateTile']").attr("disabled", true);
      $("input[name='dateTile']").attr("disabled", true);
    }
  });
  $("input[name='checkEmptyTiles']").on("click", () => {
    if($("input[name='checkEmptyTiles']").is(":checked")) {
      $("input[name='updateDateEmpty']").attr("disabled", false);
      $("input[name='dateEmpty']").attr("disabled", false);
    }
    else {
      $("input[name='updateDateEmpty']").attr("disabled", true);
      $("input[name='dateEmpty']").attr("disabled", true);
    }
  });

  //------------------------------------------------------------------------------
  //Send to server new job ORDER
  //------------------------------------------------------------------------------
  $("#startJob").on("click", function(e) {
  	$("#jobModal").modal('hide');
    let jobConfig = $("#jobForm").serialize();
    $.ajax({
      url: "/job",
      data: jobConfig,
    });
  	//socket.emit("jobAdd", jobConfig);
  });

  //------------------------------------------------------------------------------
  //Request for jobs list on server
  //------------------------------------------------------------------------------
  socket.emit("getJobList");
  socket.on("setJobList", (arrJobList) => {
    let jobHTML = "";
    for(i = 0; i < arrJobList.length; i++) {
      let zString = "";
      for(let z = 4; z <= 20; z++) {
        if(arrJobList[i]['z' + z]) {
          zString += `z${z};`;
        }
      }
      let color = `bg-soft-primary text-primary`;
      if(i == 0) {
        color = `bg-soft-success text-success`;
      }
      jobHTML += `<li class="activity-list">
        <div class="activity-icon avatar-md">
            <span class="avatar-title ${color} rounded-circle">
            ${(i+1)}
            </span>
        </div>
        <div class="d-flex">
            <div class="flex-grow-1 overflow-hidden me-7">
                <h5 class="font-size-14 mb-1">Polygon ID ${arrJobList[i]['polygonID']} ${zString}</h5>
                <p class="text-truncate text-muted font-size-13">${arrJobList[i]['mapID']}</p>
            </div>

            <div class="flex-shrink-0 text-end">
                <div class="dropdown">
                    <a class="text-muted dropdown-toggle font-size-24" role="button" data-bs-toggle="dropdown" aria-haspopup="true">
                        <i class="mdi mdi-dots-vertical"></i>
                    </a>

                    <div class="dropdown-menu dropdown-menu-end">
                        <a class="dropdown-item" href="#">Move UP</a>
                        <a class="dropdown-item" href="#">Move DOWN</a>
                        <div class="dropdown-divider"></div>
                        <a class="dropdown-item" href="#">DELETE</a>
                    </div>
                </div>
            </div>
        </div>
      </li>`;
    }
    $("#jobsList").html(jobHTML);
  });
  //------------------------------------------------------------------------------
  //Log handling section
  //------------------------------------------------------------------------------
  $('#errorLog').html('');
  $('#infoLog').html('');
  socket.on("log", (data) => {
    $("#mLog").html(data.message);
    if(data.type == "error") {
      $("#errorLog").append(`<p>${data.message}</p>`);
    }
    else {
      $("#infoLog").append(`<p>${data.message}</p>`);
    }
  });
  function getChartColorsArray(r) {
      r = $(r).attr("data-colors");
      return (r = JSON.parse(r)).map(function (r) {
          r = r.replace(" ", "");
          if (-1 == r.indexOf("--")) return r;
          r = getComputedStyle(document.documentElement).getPropertyValue(r);
          return r || void 0;
      });
  }

  var radialchartColors = getChartColorsArray("#chart");

  options = {
      chart: {
        height: 270,
        type: "radialBar",
        offsetY: -10
      },
      plotOptions: {
          radialBar: {
              startAngle: -130,
              endAngle: 130,
              dataLabels: {
                  name: { show: 1 },
                  value: {
                      offsetY: 10,
                      fontSize: "18px",
                      color: void 0,
                      formatter: function (r) {
                          return r + "%";
                      },
                  },
              },
          },
      },
      colors: [radialchartColors[0]],
      fill: { type: "gradient", gradient: { shade: "dark", type: "horizontal", gradientToColors: [radialchartColors[1]], shadeIntensity: 0.15, inverseColors: !1, opacityFrom: 1, opacityTo: 1, stops: [20, 60] } },
      stroke: { dashArray: 4 },
      legend: { show: !1 },
      series: [50],
      labels: ["10 GB"],
      title: {
        text: "Current download job",
        style: {
          fontSize:  '14px',
          fontWeight:  'bold',
          fontFamily:  undefined,
          color:  '#000000'
        },
      }
  };
  let chart = new ApexCharts(document.querySelector("#chart"), options);

  chart.render();

  socket.on("stat", (stat) => {
  	$("#mQue").html("&nbsp;Queue: " + stat.general.queue);
  	$("#mDownload").html("&nbsp;Download " + stat.general.download + " (" + formatFileSize(stat.general.size, 2) + ")");
    let proceedTiles = stat.job.download + stat.job.skip + stat.job.error + stat.job.empty;
    let progress = Math.floor(proceedTiles / stat.job.total * 10000) / 100;
    chart.updateOptions({
      series: [progress],
      labels: [formatFileSize(stat.job.size, 2)]
    });

    $("#statJobDownloadTiles").html(proceedTiles + " from " + stat.job.total);
    $("#statJobErrorTiles").html("Error: " + stat.job.error);
    $("#statJobEmptyTiles").html("Empty: " + stat.job.empty);
    $("#statJobSkipTiles").html("Skip: " + stat.job.skip);
    let ETA = stat.job.time / proceedTiles * stat.job.queue;
    ETA = secondsToHms(ETA / 1000);
    $("#ETA").html(`ETA ${ETA}`);
  });
  //----------------------------------------------------------------------------
  //Show stat from server
  //----------------------------------------------------------------------------
  socket.on("server-stat", (data) => {
    $("#memoryUsage").html(data.memory.toFixed(2) + "Mb");
    $("#cpuUsage").html(data.cpu);
    $("#fsRead").html(data.fsRead);
    $("#fsWrite").html(data.fsWrite);
    $("sDownload").html(data.download + "Mb");
    $("sQueue").html(data.queue);
  });
  $("#dashtoggle").collapse('hide');
  n = document.body;
  document.getElementById("right-bar-toggle").addEventListener("click", function(e) {
    n.classList.toggle("right-bar-enabled");
  });
  n.addEventListener("click", function(e) {
    !e.target.parentElement.classList.contains("right-bar-toggle-close") && e.target.closest(".right-bar-toggle, .right-bar") || document.body.classList.remove("right-bar-enabled");
  });

  var ColorPickr = Pickr.create({
      el: "#mpColor",
      theme: "classic",
      default: "#038edc",
      defaultRepresentation: 'RGBA',
      swatches: ["rgba(244, 67, 54, 1)", "rgba(233, 30, 99, 0.95)", "rgba(156, 39, 176, 0.9)", "rgba(103, 58, 183, 0.85)", "rgba(63, 81, 181, 0.8)", "rgba(33, 150, 243, 0.75)", "rgba(3, 169, 244, 0.7)", "rgba(0, 188, 212, 0.7)", "rgba(0, 150, 136, 0.75)", "rgba(76, 175, 80, 0.8)", "rgba(139, 195, 74, 0.85)", "rgba(205, 220, 57, 0.9)", "rgba(255, 235, 59, 0.95)", "rgba(255, 193, 7, 1)"],
      components: {
        preview: !0,
        opacity: !0,
        hue: !0,
        interaction: {
          hex: 0,
          rgba: !0,
          hsva: 0,
          input: !0,
          clear: 0,
          save: !0
        }
      }
    });
    ColorPickr.on('save', (color, instance) => {
      ColorPickr.hide();
    });
    var fillColorPickr = Pickr.create({
        el: "#mpFillColor",
        theme: "classic",
        default: "#038edc",
        defaultRepresentation: 'RGBA',
        swatches: ["rgba(244, 67, 54, 1)", "rgba(233, 30, 99, 0.95)", "rgba(156, 39, 176, 0.9)", "rgba(103, 58, 183, 0.85)", "rgba(63, 81, 181, 0.8)", "rgba(33, 150, 243, 0.75)", "rgba(3, 169, 244, 0.7)", "rgba(0, 188, 212, 0.7)", "rgba(0, 150, 136, 0.75)", "rgba(76, 175, 80, 0.8)", "rgba(139, 195, 74, 0.85)", "rgba(205, 220, 57, 0.9)", "rgba(255, 235, 59, 0.95)", "rgba(255, 193, 7, 1)"],
        components: {
          preview: !0,
          opacity: !0,
          hue: !0,
          interaction: {
            hex: 0,
            rgba: !0,
            hsva: 0,
            input: !0,
            clear: 0,
            save: !0
          }
        }
      });

      fillColorPickr.on('save', (color, instance) => {
        fillColorPickr.hide();
      });

      //------------------------------------------------------------------------
      //CATEGORY Manager
      //------------------------------------------------------------------------
      globalMarkID = 0;
      globalCategoryID = 0;
      globalShowMarkManager = false;

      $.ajaxSetup({
        dataType: "json",
        beforeSend: function(jqXHR, settings) {
          jqXHR.url = settings.url;
        },
        error: (responce, code) => {
          alertify.error(`Request ${responce.url}: ${responce.status} ${responce.statusText}`);
        }
      });

      function getCategoryList(arrCategory, parentID = 0) {
        let arrResult = [];
        for(let i = 0; i < arrCategory.length; i++){
          if (arrCategory[i]['parentID'] == parentID) {
            arrResult.push(arrCategory[i]);
          }
        }
        if (arrResult.length > 0) {
          return arrResult;
        }
        else {
          return false;
        }
      }

      function recurCategoryList(categoryList, parentID = 0, space = "") {
        let html = "";
        let html2 = "";
        let arrCategory = getCategoryList(categoryList, parentID);
        if(arrCategory) {
          if (parentID > 0) {
            html += "<ul>";
          }
          for(let i = 0; i < arrCategory.length; i++) {
            html += `<li class="folder"><a href="#" categoryID="${arrCategory[i]['ID']}">${arrCategory[i]['name']}</a>`;
            let [subHtml, subHtml2] = recurCategoryList(categoryList, arrCategory[i]['ID'], space + "&nbsp;&nbsp;");
            if(subHtml) {
              html+= subHtml;
            }
            html += `</li>`;
            html2 += space + `<option value="${arrCategory[i]['ID']}">${arrCategory[i]['name']}</option>`;
            if (subHtml2) {
              html2 += subHtml2;
            }
          }
          if (parentID > 0) {
            html += "</ul>";
          }
          return [html, html2];
        }
        else {
          return [false, false];
        }
      }

      function updateCategoryList() {
        return new Promise(function(resolve, reject) {
          $.ajax({
            url: "/marks/category",
            dataType: "json",
            success: (responce, code) => {
              if (responce.result) {
                let [html, html2] = recurCategoryList(responce.list);
                $("#managerCategoryList").html(html);
                $("#marksCategoryList").html(`<option value="0">Root</option>` + html2);
                $("#marksCategoryList2").html(html2);
                $("#managerCategoryList a").on("click", (event) => {
                  $("#managerCategoryList a").removeClass("bg-secondary");
                  event.stopPropagation();
                  let reqCatID = $(event.target).attr("categoryid");
                  $.ajax({
                    url: "/marks/list/" + reqCatID,
                    dataType: "json",
                    success: (responce, code) => {
                      if(responce.result) {
                        let html = "";
                        for(let i = 0; i < responce.list.length; i++) {
                          let name = responce.list[i]['name'];
                          if(name.length < 1) {
                            name = "Default mark " + responce.list[i]['ID'];
                          }
                          html += `<li><a href="#" markID="${responce.list[i]['ID']}">${name}</a></li>`;
                        }
                        $("#managerMarksList").html(html);
                        $("#managerMarksList a").on("click", (event) => {
                          $("#managerMarksList a").removeClass("bg-secondary");
                          event.stopPropagation();
                          globalMarkID = $(event.target).attr("markid");
                          $(event.target).addClass("bg-secondary");
                        });
                      }
                      else {
                        $("#managerMarksList").html('<li><a href="#" markID="0">Empty list</a></li>');
                      }
                    }
                  });
                  $(event.target).addClass("bg-secondary");
                  globalMarkID = 0;
                });
                resolve(true);
              }
              else {
                alertify.warning(responce.message);
                resolve(true);
              }
            },
            error: (responce, code) => {
              alertify.error(`Request ${responce.url}: ${responce.status} ${responce.statusText}`);
              resolve(false);
            }
          });
        });
      }

      updateCategoryList();

      $("#t-placemarks-manager").on("click", async () => {
        let updateResult = await updateCategoryList();
        if(updateResult) {
          $("#marksManagerModal").modal('show');
        }
      });

      $("#categoryAddBtn").on('click', () => {
        $("#marksManagerModal").modal('hide');
        $("#marksCategoryModal").modal('show');
      });

      $("#formCategoryClose").on("click", () => {
        $("#marksManagerModal").modal('show');
      });

      $("#formCategorySave").on("click", () => {
        let data = $("#formAddCategory").serialize();
        $.ajax({
          method: "post",
          url: "/marks/category/add",
          data: data,
          dataType: "json",
          success: async (responce, code) => {
            if(responce.result == true) {
              alertify.success(responce.message);
              await updateCategoryList();
              $("#marksManagerModal").modal('show');
              $("#marksCategoryModal").modal('hide');
            }
            else {
              alertify.error(responce.message);
            }
          }
        });
      });

      $("#btnMarkEdit").on("click", (event) => {
        if(globalMarkID != 0) {
          $("#marksManagerModal").modal('hide');
          globalShowMarkManager = true;
          getMarkInfo(globalMarkID);
        }
        else {
          alertify.warning("You didn`t select any mark for editing.");
        }
      });

      function getMarkInfo(markID = 0) {
        return new Promise(function(resolve, reject) {
          $.ajax({
            url: "/marks/info/" + markID,
            dataType: "json",
            success: (response, code) => {
              $(`#marksCategoryList2 option[value=${response.categoryID}]`).attr('selected','selected');
              $("#markPropertiesForm").find(":input[name='name']").val(response.name);
              $("#markPropertiesForm").find(":input[name='width']").val(response.width);
              fillColorPickr.setColor(response.fillColor + Math.floor(response.fillOpacity * 255).toString(16), false);
              ColorPickr.setColor(response.color, false);
              $("#marksPropertiesID").val(markID);
              $("#marksPropertiesModal").modal('show');
              resolve(true);
            },
            error: (response, code) => {
              alertify.error(`Request ${response.url}: ${response.status} ${response.statusText}`);
              resolve(false);
            }
          });
        });
      }
      //------------------------------------------------------------------------------
      //Show config window for job order
      //------------------------------------------------------------------------------
      window.showJobModal = function(e) {
        $("#polygonID").val(e.relatedTarget.maptoriumID);
        $("#jobModal").modal('show');
      }
      //----------------------------------------------------------------------------
      //Context menu: GEOMETRY PROPERTIES
      //----------------------------------------------------------------------------
      window.propertiesGeometry = function(e, ID) {
        //console.log(e.relatedTarget);
        let markID = e.relatedTarget.maptoriumID;
        getMarkInfo(markID);
      }

      $("#marksPropertiesSave").on("click", (event) => {
        //let data = $("#markPropertiesForm").serialize();
        let data = $('#markPropertiesForm').serializeArray().reduce(function(a, x) { a[x.name] = x.value; return a; }, {});
        //console.log(data);
        let fillColor = fillColorPickr.getColor();
        let opacity = Math.round(fillColor.a * 100) / 100;
        data.fillOpacity = opacity;
        fillColor = fillColor.toHEXA();
        fillColor = "#" + fillColor[0] + fillColor[1] + fillColor[2];
        data.fillColor = fillColor;
        let color = ColorPickr.getColor();
        color = color.toHEXA();
        color = "#" + color[0] + color[1] + color[2];
        data.color = color;
        data.update = true;
        $.ajax({
          url: "/marks/update",
          data: {data: JSON.stringify(data)},
          dataType: "json",
          method: "post",
          success: (response, code) => {
            if(response.result) {
              alertify.success(response.message);
              map.eachLayer(function(layer){
                if(layer.maptoriumID == $("#marksPropertiesID").val()) {
                  layer.setStyle({
                    color: color,
                    fillColor: fillColor,
                    fillOpacity: opacity,
                    weight: $("#markPropertiesForm").find(":input[name='width']").val()
                  });
                  layer.setTooltipContent($("#markPropertiesForm").find(":input[name='name']").val());
                }
              });
            }
            else {
              alertify.error(response.message);
            }
            $("#marksPropertiesModal").modal('hide');
            if(globalShowMarkManager) {
              globalShowMarkManager = false;
              $("#marksManagerModal").modal('show');
            }
          }
        })

      });

      //------------------------------------------------------------------------
      //INSTRUMENTAL PANEL
      //------------------------------------------------------------------------
      globalPanelMove = false;

      $("#panelMoveBtn").on( 'mousedown', (e) => {
        globalPanelMove = true;
      });

      $("#panelMoveBtn").on( 'mouseup', (e) => {
        globalPanelMove = false;
      });

      $("body").on("mousemove", (e) => {
        if(globalPanelMove) {
          $("#intrumentalPanel").css("left", e.pageX - 20);
          $("#intrumentalPanel").css("top", e.pageY - 20);
        }
      });
});
