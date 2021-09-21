import $ from 'jquery';
import 'bootstrap';
import 'datatables.net/js/jquery.dataTables.min.js';
// import 'datatables.net-bs5';
import 'datatables.net-select/js/dataTables.select.min.js';
import 'datatables.net-buttons/js/dataTables.buttons.min.js';
// import 'datatables.net-buttons/js/buttons.colVis.min.js';
// import 'datatables.net-buttons/js/buttons.flash.min.js';
import 'datatables.net-buttons/js/buttons.html5.min.js';
// import 'datatables.net-buttons/js/buttons.print.min.js';
import datatables_hu from './utils/datatables.hu.json';
import { lubexpertLogo, mobil1Logo, arajanlatTemplate } from './utils/arajanlatTemplate';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = pdfFonts.pdfMake.vfs; // Fix: Roboto-Regular.ttf not found
// import 'datatables.net-editor-bs5';

// we also need to process some styles with webpack
import fontawesome from '@fortawesome/fontawesome';
import { faCloudUploadAlt, faExclamationCircle, faCheckCircle } from '@fortawesome/fontawesome-free-solid';
fontawesome.library.add(faCloudUploadAlt);
fontawesome.library.add(faExclamationCircle);
fontawesome.library.add(faCheckCircle);
import './styles/index.scss';

const drop = document.querySelector('input');
const filesInput = document.querySelector('#files');
const errorArea = document.querySelector('.error-toast');
const notificationArea = document.querySelector('.notification-toast');

var tetelekTable;

const handleIn = () => {

  $('.drop').css({
    border: '4px dashed #3023AE',
    background: 'rgba(0, 153, 255, .05)'
  });

  $('.cont').css({
    color: '#3023AE'
  });

};

const handleOut = () => {

  $('.drop').css({
    border: '3px dashed #DADFE3',
    background: 'transparent'
  });

  $('.cont').css({
    color: '#8E99A5'
  });

};

const inEvents = ['dragenter', 'dragover'];
const outEvents = ['dragleave', 'dragend', 'mouseout', 'drop'];

inEvents.forEach(event => drop.addEventListener(event, handleIn));
outEvents.forEach(event => drop.addEventListener(event, handleOut));

const handleFileSelect = event => {
  const files = event.target.files;

  for (let file of files) {

    // Only process excel files.
    if (!file.type.match('officedocument.*')) {
      continue;
    }

    window.postMessage({
      type: 'file-dropped',
      data: file.path
    }, '*');
  }

  event.preventDefault();
  event.stopPropagation();

};

filesInput.addEventListener('change', handleFileSelect);

const $progress = $('.progress'),
  $bar = $('.progress__bar'),
  $text = $('.progress__text'),
  $loader = $('.loader'),
  orange = 30,
  yellow = 55,
  green = 85;

const resetColors = () => {

  $bar.removeClass('progress__bar--green')
    .removeClass('progress__bar--yellow')
    .removeClass('progress__bar--orange')
    .removeClass('progress__bar--blue');

  $progress.removeClass('progress--complete');

};

const update = (percent) => {

  percent = parseFloat( percent.toFixed(1) );

  $text.find('em').text( percent + '%' );

  if( percent >= 100 ) {

    percent = 100;
    $progress.addClass('progress--complete');
    $bar.addClass('progress__bar--blue');
    $text.find('em').text('Kész');

  } else {

    if( percent >= green ) {
      $bar.addClass('progress__bar--green');
    }

    else if( percent >= yellow ) {
      $bar.addClass('progress__bar--yellow');
    }

    else if( percent >= orange ) {
      $bar.addClass('progress__bar--orange');
    }

  }

  $bar.css({ width: percent + '%' });

};

const processStartHandler = () => {

  $progress.addClass('progress--active');
  // $progress.show();
  $loader.show();
  $('.wrapper').hide();
};

const progressHandler = percentage => update(percentage);

const processCompletedHandler = ({ processedItemsCount/*, incompatibleItems, erroneousItems, logFilePath*/ }) => {

  // $loader.hide();
  $('.wrapper').show();

  $(notificationArea).find('.text').text(
    [
      `${processedItemsCount} termék sikeresen beolvasva,`,
      // `${incompatibleItems.length} item(s) skipped,`,
      // `${erroneousItems.length} item(s) erroneous,`,
      // `Log file ${logFilePath} is written on disk.`
    ].join('\r\n')
  );

  $(notificationArea).show().animate({
    top: '10%'
  }, 'slow');

};

const processErrorHandler = data => {

  const oldText = $(errorArea).find('.text').text();

  $(errorArea).find('.text').text(
    [
      `${oldText}`,
      `${data.itemInfo} ${data.statusText}`
    ].join('\r\n')
  );

  $(errorArea).show().animate({
    bottom: '10%'
  }, 'slow');

};

const fileErrorHandler = data => {

  $(errorArea).find('.text').text(`${data}`);

  $(errorArea).show().animate({
    bottom: '10%'
  }, 'slow');

};

const resetProcess = () => {

  resetColors();
  update(0);
  $('.wrapper').show();
  // $progress.hide();
  $loader.hide();
};

const errorAreaClickHandler = () => {

  $(errorArea).animate({
    bottom: 0
  }, 'slow', function() { $(this).hide().find('.text').text('')});

};

const notificationAreaClickHandler = () => {

  $(notificationArea).animate({
    top: 0
  }, 'slow', function() { $(this).hide().find('.text').text('')});

  errorAreaClickHandler();
  resetProcess();
};

errorArea.addEventListener('click', errorAreaClickHandler);

notificationArea.addEventListener('click', notificationAreaClickHandler);

const disableDrop = event => {
  if(event.target !== filesInput) {
    event.preventDefault();
    event.stopPropagation();
  }
};

// Prevent loading a drag-and-dropped file
['dragover', 'drop'].forEach(event => {
  document.addEventListener(event, disableDrop);
});

window.addEventListener('message', event => {
  const message = event.data;
  const { data, type } = message;

  switch (type) {
    case 'process-started':
      processStartHandler();
      break;
    case 'excel-feldolgozva':
      // console.log('excel-feldolgozva', data);
      tetelekTable.clear();
      
      data.arajanlatRows.map((e, i) => {
        tetelekTable.row.add([
          "",   // Checkbox
          e[0], // SAP kód: Kalkuláció A oszlopa
          e[1], // Terméknév: Kalkuláció H oszlopa
          e[2], // Kiszerelés: Kalkuláció J oszlopa
          e[3], // Átadási ár: Kalkuláció S oszlopa
          e[4], // Átadási ár EUR/kiszerelés: kiszerelés és a EUR/l szorzata
          e[5], // Tájékoztató érték HUF
        ]).draw();
      });
      
      setTimeout(() => {
        menuHandler('#tetelek');
        $loader.hide();
      });
      processCompletedHandler(data.arajanlatRows);
      break;
    case 'process-completed':
      processCompletedHandler(data);
      break;
    case 'progress':
      progressHandler(data);
      break;
    case 'process-error':
      processErrorHandler(data);
      break;
    case 'file-error':
      fileErrorHandler(data);
  }
});

// Menü működtetés
const menuHandler = (target) => {

  if (typeof target == 'string'){
    target = $('a[href="'+ target +'"]')
  }

  if ($(target).hasClass('active')) return;

  // Többi menü elem aktivátásának megszüntetése
  $('.nav-link').each((i,obj) => $(obj).removeClass('active'));

  // Menü elem aktívvá tétele
  $(target).addClass('active');

  // Többi szekció elrejtése
  $('section').each((i,obj) => $(obj).hide());

  // Kívánt szekció megjelenítése
  let section = $(target).attr('href');
  $(section).show();
}

// Menüpontra kattintás
window.addEventListener('click', event => {
  const target = event.target;

  // Menü elemre kattintás
  if ($(target).hasClass('nav-link')){
    menuHandler(target);
  }
});

/**
 * Oldal betöltés
 */
  
(function () {
  'use strict'

  var selectedTetelek;
  var tetelekTableConfig = {
    dom: 'Bfrtip',
    language: datatables_hu,
    fixedColumns:   {
      left: 2
    },
    columnDefs: [ 
      {
        targets: 0,
        orderable: false,
        className: 'select-checkbox',
      },
      {
        targets: [1, 3, 4, 5, 6],
        className: 'dt-body-right',
      }
    ],
    select: {
      style:    'multi+shift',
      /*selector: 'td:first-child'*/
    },
    buttons: [],
  }

  tetelekTable = $('#tetelek-table').DataTable(tetelekTableConfig)

  var kedvezmenyekTableConfig = Object.assign(tetelekTableConfig, {
    columnDefs: [ 
      {
        targets: 0,
        orderable: false,
        className: 'select-checkbox',
      },
      {
        targets: [1, 3, 4, 5, 6, 7],
        className: 'dt-body-right',
      }
    ], 
    buttons: [
      'selectAll',
      'selectNone',
      {
        text: 'Kedvezmény beállítása',
        attr:  {
          title: 'Kedvezmény beállítása',
          id: 'kedvezmeny-beallitasa-button',
          'data-bs-target': '#kedvezmeny-modal',
          'data-bs-toggle': 'modal',
        },
        action: function ( e, dt, node, config ) {
          $('#kedvezmeny-szazalek').val('');
          $('#kedvezmeny-mertek').val('');
        }
      }, 
      {
        text: 'PDF mentés',
        extend: 'pdfHtml5',
        filename: 'Árajánlat ' + new Date().toISOString().slice(0, 10),
        orientation: 'portrait', //landscape
        pageSize: 'A4',
        download: 'open',
        exportOptions: {
          columns: ':visible',
          search: 'applied',
          order: 'applied'
        },
        customize: function (doc) {
          // Remove the title created by datatTables
          doc.content.splice(0,1);
          //Create a date string that we use in the footer. Format is dd-mm-yyyy
          // var now = new Date();
          // var today = now.getFullYear()+'.'+(now.getMonth()+1)+'.'+now.getDate();
          var today = new Date().toLocaleDateString('hu-HU')
          // A documentation reference can be found at
          // https://github.com/bpampuch/pdfmake#getting-started
          // Set page margins [left,top,right,bottom] or [horizontal,vertical]
          // or one number for equal spread
          // It's important to create enough space at the top for a header !!!
          doc.pageMargins = [20,20,20,30];
          // Set the font size fot the entire document
          doc.defaultStyle.fontSize = 10;
          // Set the fontsize for the table header
          doc.styles.tableHeader.fontSize = 10;
          // Change dataTable layout (Table styling)
          // To use predefined layouts uncomment the line below and comment the custom lines below
          // doc.content[0].layout = 'lightHorizontalLines'; // noBorders , headerLineOnly
          // var objLayout = {};
          // objLayout['hLineWidth'] = function(i) { return .5; };
          // objLayout['vLineWidth'] = function(i) { return .5; };
          // objLayout['hLineColor'] = function(i) { return '#aaa'; };
          // objLayout['vLineColor'] = function(i) { return '#aaa'; };
          // objLayout['paddingLeft'] = function(i) { return 4; };
          // objLayout['paddingRight'] = function(i) { return 4; };
          // doc.content[0].layout = objLayout;
          // Remove original table created by datatTables
          doc.content[0] = [];

          // PDF fejléc képek
          arajanlatTemplate[0]['columns'][0]['image'] = lubexpertLogo;
          arajanlatTemplate[0]['columns'][2]['image'] = mobil1Logo;

          // PDF Vevő adatai
          arajanlatTemplate[2]['table']['body'][1][1]['stack'].push([
            { text: $('#cegnev').val() || $('#nev').val(), bold: true, fontSize: 16 }, // Vevő neve
            { text: $('#irsz').val()+' '+$('#varos').val()+' '+$('#utca').val()+' '+$('#hazsszam').val() }, // Vevő címe
            { text: $('#email').val() },   // Vevő email címe
            { text: $('#telefon').val() }, // Vevő telefonszáma
            { text: $('#fax').val() },     // Vevő faxszáma
          ])


          // PDF Táblázat feltöltése a kedvezmény táblázat soraival
          let pdfTermekek = [arajanlatTemplate[5]['table']['body'][0]];
          kedvezmenyekTable.data().map(row => {
            pdfTermekek.push([
              { text: row[1], alignment: 'right' }, // SAP kód
              { text: row[2], alignment: 'left'  }, // Terméknév
              { text: row[3], alignment: 'right' }, // Kiszerelés (Liter)
              { text: row[5], alignment: 'right' }, // Átadási ár (EUR/L)
              { text: row[6], alignment: 'right' }, // Átadási ár (EUR/kiszer.)
              { text: row[7], alignment: 'right' }, // Tájékoztató érték (HUF)
            ])
          })
          
          arajanlatTemplate[5]['table']['body'] = pdfTermekek;

          // Árajánlat érvényessége
          let ervenyesseg = $('#ervenyesseg').val();
          if (ervenyesseg){
            arajanlatTemplate[6]['text'] = arajanlatTemplate[6]['text'].replace('30 nap vagy megállapodásban rögzített időpont', ervenyesseg + ' nap');
          }

          // Értékesítő neve
          arajanlatTemplate[20]['columns'][1]['stack'][0]['text'] = $('#ertekesitonev').val()

          // console.log('arajanlatTemplate', arajanlatTemplate);
            
          doc.content[1] = arajanlatTemplate;

          doc['footer'] = function(currentPage, pageCount) { 
            return { text: today, alignment: 'center' }
          }
        }
      }] 
  })
  
  var kedvezmenyekTable = $('#kedvezmenyek-table').DataTable(kedvezmenyekTableConfig)

  // Táblák szinkronizálása sor kijelölése, vagy kijelölés megszüntetése esetén
  const syncTables = (e, dt, type, indexes) => {
    if (type !== 'row') return;

    kedvezmenyekTable.clear();
    selectedTetelek = tetelekTable.rows({ selected: true }).data();

    if (!selectedTetelek.length){
      kedvezmenyekTable.destroy(); 
      kedvezmenyekTable = $('#kedvezmenyek-table').DataTable(kedvezmenyekTableConfig);
      return;
    } 

    for (var i=0; i < selectedTetelek.length; i++){
      // console.log(selectedTetelek[i]);
      kedvezmenyekTable.row.add([
        "",                    // Checkbox
        selectedTetelek[i][1], // SAP kód: Kalkuláció A oszlopa
        selectedTetelek[i][2], // Terméknév: Kalkuláció H oszlopa
        selectedTetelek[i][3], // Kiszerelés: Kalkuláció J oszlopa
        "",                    // Kedvezmény
        selectedTetelek[i][4], // Átadási ár: Kalkuláció S oszlopa
        selectedTetelek[i][5], // Átadási ár EUR/kiszerelés: kiszerelés és a EUR/l szorzata
        selectedTetelek[i][6], // Tájékoztató érték HUF
      ]).draw();
    }
  }

  // Sor kijelölése, vagy kijelölés megszüntetése
  ['select', 'deselect'].forEach(event => {
    tetelekTable.on(event, syncTables)
  });

  const kedvezmenySave = () => {
    let szazalek = parseInt($('#kedvezmeny-szazalek').val());
    let mertek = parseInt($('#kedvezmeny-mertek').val());

    if (0 <= szazalek && szazalek < 100){

      // Ha nincs kijelölt sor, akkor minden sorra alkalmazzuk a %-os kedvezményt
      let rows = kedvezmenyekTable.rows();
      if (kedvezmenyekTable.rows({selected: true}).count() > 0){
        rows = kedvezmenyekTable.rows({selected: true});
      }

      rows.every(function (rowIdx, tableLoop, rowLoop) {
          let termek = kedvezmenyekTable.cell(rowIdx, 1).data();

          // Eredeti ár
          let eredetiAr;
          tetelekTable.rows((idx, data, node) => {
            if (data[1] == termek){
              eredetiAr = data[3];
            }
          })

          let szazalekMezo = kedvezmenyekTable.cell(rowIdx, 4);
          szazalekMezo.data(szazalek == 0 ? '' : szazalek+' %');

          let bruttoMezo = kedvezmenyekTable.cell(rowIdx, 6);
          let bruttoAr = eredetiAr.replace(/ /g, '');
          let deviza = bruttoAr.slice(-3, bruttoAr.length);
          bruttoAr = parseInt(bruttoAr.slice(0, -3));
          let kedvezmenyesAr = Math.ceil( bruttoAr * ((100 - szazalek) / 100) );
          bruttoMezo.data(kedvezmenyesAr+' '+deviza);
        })
        .draw();
    }

    if (mertek && mertek > 0){
      kedvezmenyekTable.row.add(["", "", "Kedvezmeny", "", -1 * mertek + ' EUR', "", -1 * mertek + ' EUR', ""]).draw();
    }

    $('#kedvezmeny-cancel').trigger('click');
  }

  $('#kedvezmeny-save').on('click', kedvezmenySave);

  // tetelekTable.on('select deselect', function (e, dt, type, indexes){
  //   if (type === 'row') {
  //     kedvezmenyekTable.clear();
  //     selectedTetelek = tetelekTable.rows({ selected: true }).data();

  //     for (var i=0; i < selectedTetelek.length; i++){
  //       kedvezmenyekTable.row.add(["", selectedTetelek[i][1], selectedTetelek[i][2], selectedTetelek[i][3]]).draw();
  //     }
  //   }
  // });

  // Example starter JavaScript for disabling form submissions if there are invalid fields
  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  var forms = document.querySelectorAll('.needs-validation')

  // Loop over them and prevent submission
  Array.prototype.slice.call(forms)
    .forEach(function (form) {
      form.addEventListener('submit', function (event) {
        if (!form.checkValidity()) {
          event.preventDefault()
          event.stopPropagation()
        }

        form.classList.add('was-validated')
      }, false)
    })

})()