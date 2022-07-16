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
    console.log(jobConfig);
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
    console.log(arrJobList);
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
    console.log(data.type);
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
    //console.log(stat);
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
    //console.log(stat.job);
    //console.log(ETA);
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
});
