import $ from 'jquery';
import 'bootstrap';
import 'datatables.net/js/jquery.dataTables.min.js';
import 'datatables.net-select/js/dataTables.select.min.js';
import 'datatables.net-buttons/js/dataTables.buttons.min.js';
import 'datatables.net-buttons/js/buttons.html5.min.js';
import datatables_hu from './utils/datatables.hu.json';
import { lubexpertLogo, mobil1Logo, isoLogo, lablecLogo, arajanlatTemplate } from './utils/arajanlatTemplate';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = pdfFonts.pdfMake.vfs; // Fix: Roboto-Regular.ttf not found

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
      `Termékek sikeresen beolvasva,`
      //`${processedItemsCount} termék sikeresen beolvasva,`,
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
      const { arfolyam, arajanlatRows } = data;
      $('#arfolyam').text(arfolyam + ' HUF/EUR');

      tetelekTable.clear();
      arajanlatRows.map((e, i) => {
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
  const target = event.target

  // Menü elemre kattintás
  if ($(target).hasClass('nav-link')){
    menuHandler(target)
  }
})

const discountPrice = (price, percentage, decimals = 0) => {
  if (!price) return

  // Set Discount price decimals
  price = (price * ((100 - percentage) / 100)).toFixed(decimals)

  // Thousand separated discount price
  price = price.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, " ") 
  
  return price
}

/**
 * Oldal betöltés
 */
  
(function () {
  'use strict'

  // Setup - add a text input to each header cell
  $('#tetelek-table thead tr')
    .clone(true)
    .addClass('filters')
    .appendTo('#tetelek-table thead');

  var selectedTetelek;
  var tetelekTableConfig = {
    dom: 'Bfrtip',
    language: datatables_hu,
    fixedColumns: true,
    // fixedColumns:   {
    //   left: 2
    // },
    columnDefs: [ 
      {
        targets: 0,
        orderable: false,
        className: 'select-checkbox',
      },
      {
        targets: [1, 3, 4, 5, 6],
        className: 'dt-body-right',
      },
      {
        targets: [3, 4, 5],
        render: $.fn.dataTable.render.number( ' ', ',', 2, '' )
      },
      {
        targets: [6],
        render: $.fn.dataTable.render.number( ' ', ',', 0, '' )
      },
    ],
    select: {
      style:    'multi+shift',
      selector: 'tr:not(.no-select) td',
      /*selector: 'td:first-child'*/
    },
    buttons: [],
    orderCellsTop: true,
    fixedHeader: true,
    initComplete: function () {

      let api = this.api();

      // For each column
      api.columns()
          .eq(0)
          .each(function (colIdx) {

              // Set the header cell to contain the input element
              let cell = $('.filters th').eq(
                  $(api.column(colIdx).header()).index()
              );
              
              let title = $(cell).text();
              if (!title) return;
              title = cell.html().split('<br>')[0];

              let cellWidth = 2 * Math.ceil($(cell).width());
              cellWidth = '100%';
              // console.log('cellWidth', cellWidth);

              $(cell).html('<input type="text" placeholder="'+title+'"/>');

              // On every keypress in this input
              $('input', $('.filters th').eq($(api.column(colIdx).header()).index()))
                  .off('keyup change clear')
                  .on('keyup change clear', function(e) {
                      e.stopPropagation();

                      // Get the search value
                      $(this).attr('title', $(this).val());

                      let cursorPosition = this.selectionStart;
                      
                      // Search the column for that value
                      api.column(colIdx)
                          .search(this.value)
                          .draw();

                      $(this).focus()[0]
                              .setSelectionRange(cursorPosition, cursorPosition);
                  });
          });
      }
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
      },
      {
        targets: [3, 5, 6],
        render: $.fn.dataTable.render.number( ' ', ',', 2, '' )
      },
      {
        targets: [7],
        render: $.fn.dataTable.render.number( ' ', ',', 0, '' )
      },
    ],
    createdRow: function(row, data, dataIndex) {
      if (data[2] == "Kedvezmény"){
        $(row).addClass('kedvezmeny-sor').addClass('no-select')
        $(row).find("td:first").attr('class', '')
      }
    },
    buttons: [
      'selectAll',
      'selectNone',
      {
        text: 'Kedvezmény beállítása',
        attr:  {
          title: 'Kedvezmény beállítása',
          id: 'kedvezmeny-beallitasa-button',
          // class: 'btn btn-primary',
          'data-bs-target': '#kedvezmeny-modal', // Open modal
          'data-bs-toggle': 'modal', // Open modal
        },
        action: function ( e, dt, node, config ) {
          let rows = kedvezmenyekTable.rows({selected: true}).data()
          let maxSzazalek = Math.max.apply(Math, rows.map(i => parseInt(i[4])))
          
          if (maxSzazalek){
            $('#kedvezmeny-szazalek option[value="'+maxSzazalek+'%"]').prop('selected', true)
          } else {
            $('#kedvezmeny-szazalek option[value="0%"]').prop('selected', true)
          }
          // $('#kedvezmeny-mertek').val('')
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
          let today = new Date().toLocaleDateString('hu-HU')
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
          doc.content[0] = []

          doc['footer'] = function(currentPage, pageCount) { 
            return { text: today, alignment: 'center' }
          }

          let template = JSON.stringify(arajanlatTemplate)

          // Teszt adatok
          let tesztAdatok = {
            
            // Értékesítő
            ertekesito_nev: 'Binder Zoltán',
            ertekesito_osztaly: 'Teszt osztály',
            ertekesito_email: 'binder.zoltan@lubexpert.hu',
            ertekesito_kozvetlen_szam: '+36 20/296-9911',
            ertekesito_fax: '+36 27/343-746',

            // Ügyfél
            ugyfel_nev: 'Kepecz Norbert',
            cegnev: 'Partner Autóalkatrész Piac Kft.',
            irsz: '7630',
            varos: 'Pécs',
            utca: 'Mohácsi út 14.',
            email: 'n.kepecz@partnerauto.hu',
            telefon: '30/929-4606',
            fax: '1235678',
            
            // Ajánlat
            szallitasi_forma: 'Kiszállítást kér',
            ervenyesseg: '30 nap',
            fizetesi_mod: 'Halasztott utalás',
            utalas_eddig: '15 nap',
          }

          // for (const [key, value] of Object.entries(tesztAdatok)) {
          //   $('#'+key).val(value)
          // }

          // Változók cseréje az árajánlat sablonban
          let fromTo = {

            // PDF logók
            '%lubexpertLogo%': lubexpertLogo,
            '%isoLogo%': isoLogo,
            '%mobil1Logo%': mobil1Logo,
            '%lablecLogo%': lablecLogo,

            // Értékesítő
            '%ertekesito_nev%': $('#ertekesito_nev').val(),
            '%ertekesito_osztaly%': $('#ertekesito_osztaly').val(),
            '%ertekesito_email%': $('#ertekesito_email').val(),
            '%ertekesito_kozvetlen_szam%': $('#ertekesito_kozvetlen_szam').val(),
            '%ertekesito_fax%': $('#ertekesito_fax').val(),

            // Ügyfél
            '%ugyfel_nev%': $('#ugyfel_nev').val(),
            '%cegnev%': $('#cegnev').val(),
            '%varos%': $('#varos').val(),
            '%utca%': $('#utca').val(),
            '%irsz%': $('#irsz').val(),
            '%email%': $('#email').val(),
            '%telefon%': $('#telefon').val(),
            '%fax%': $('#fax').val(),

            // Ajánlat
            '%szallitas_text%': $('#szallitasi_forma').val() == 'Érte jön' ? 'Érte jön. Nem kér szállítást.' : 'Szállítási határidő: 3-4 hét. A szállítás díjmentes.',
            '%evernyesseg%': $('#ervenyesseg').val(),
            '%fizetesi_mod%': $('#fizetesi_mod').val(),
            '%hatarido%': $('#fizetesi_mod').val() == 'Előre utalás' ? '0 nap' : $('#utalas_eddig').val(),
            '%arfolyam%': parseInt($('#arfolyam').text()),
            '%datum%': today,
            '%oldalak_szama%': doc['footer'].length,
          }

          for (const [key, value] of Object.entries(fromTo)) {
            // console.log(`${key}: ${value}`)
            let re = new RegExp(key, "g")
            template = template.replace(re, value)
          }

          template = JSON.parse(template);

          // PDF Táblázat feltöltése a kedvezmény táblázat soraival
          let pdfTermekek = [template[7]['table']['body'][0]]
          kedvezmenyekTable.data().map(row => {
            pdfTermekek.push([
              { text: row[1], alignment: 'right' }, // SAP kód
              { text: row[2], alignment: 'left'  }, // Terméknév
              { text: row[3], alignment: 'right' }, // Kiszerelés (L, Kg)
              { text: row[5], alignment: 'right' }, // Termék nettó átadási ára (EUR/L, Kg)
              { text: row[6], alignment: 'right' }, // Nettó átadási ár (EUR/kiszerelés)
              { text: row[7], alignment: 'right' }, // Tájékoztató nettó ár (HUF/kiszerelés)
            ])
          })
          
          template[7]['table']['body'] = pdfTermekek
          
          doc.content[1] = template
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
      kedvezmenyekTable.row.add([
        "",                    // Checkbox
        selectedTetelek[i][1], // SAP kód: Kalkuláció A oszlopa
        selectedTetelek[i][2], // Terméknév: Kalkuláció H oszlopa
        selectedTetelek[i][3], // Kiszerelés: Kalkuláció J oszlopa
        "",                    // Kedvezmény
        selectedTetelek[i][4], // Átadási ár: Kalkuláció S oszlopa
        selectedTetelek[i][5], // Átadási ár EUR/kiszerelés: kiszerelés és a EUR/l szorzata
        selectedTetelek[i][6], // Tájékoztató nettó ár HUF
      ]).draw();
    }
  }

  // Sor kijelölése, vagy kijelölés megszüntetése
  ['select', 'deselect'].forEach(event => {
    tetelekTable.on(event, syncTables)
  });

  /**
   * Kedvezmények mentése
   */
  const kedvezmenySave = () => {
    
    let szazalek = parseInt($('#kedvezmeny-szazalek').val()) || 0;
    let raklapos = $('#raklapos-tetel').is(':checked');
    let erteJon = $('#szallitasi_forma').val() == 'Érte jön';
    let arfolyam = parseInt($('#arfolyam').text());
    // let mertek = parseInt($('#kedvezmeny-mertek').val()) || 0;

    // Kedvezmény %-ának beállítása
    if (0 <= szazalek && szazalek <= 30) {

      // A kijelölt sorokra alkalmazzuk a %-os kedvezményt
      let rows = kedvezmenyekTable.rows({selected: true})

      // Kedvezmény alkalmazása a táblázat soraira
      rows.every(function (rowIdx, tableLoop, rowLoop) {
          
        let termekNev = kedvezmenyekTable.cell(rowIdx, 1).data()
        let tovabbiKedvezmeny = 0

        // Sor azonosítása terméknév szerint
        let row = tetelekTable.rows().data().filter(row => row[1] == termekNev)[0]
        if (!row) return

        // Eredeti árak
        let eredetiArak = {
          literAr: row[4],
          kiszereles: row[3], 
          kiszerelesAr: row[5],
          tajekoztatoErtek: row[6],
        }

        // Kedvezményes árak (2 tizedesjegyre kerekítve)
        let kedvezmenyesArak = {
          kedvezmeny: szazalek != 0 ? ' + ' + szazalek + '%' : '',
          literAr: discountPrice(eredetiArak.literAr, szazalek, 2),
          kiszerelesAr: discountPrice(eredetiArak.literAr, szazalek, 2),
          tajekoztatoErtek: discountPrice(eredetiArak.tajekoztatoErtek, szazalek),
        }

        // Raklapos tételek kedvezménye (EUR/L árból lejön további 0.05 EUR)
        // Ha érte jön, akkor további 0.09 EUR lejön, a kedvezmények összevonódnak
        if (raklapos || erteJon) {
          
          if (raklapos) tovabbiKedvezmeny += 0.05
          if (erteJon) tovabbiKedvezmeny += 0.09 

          kedvezmenyesArak.kedvezmeny = (tovabbiKedvezmeny > 0 && tovabbiKedvezmeny + ' EUR') + kedvezmenyesArak.kedvezmeny
          kedvezmenyesArak.literAr = kedvezmenyesArak.literAr - tovabbiKedvezmeny
          kedvezmenyesArak.kiszerelesAr = (kedvezmenyesArak.kiszerelesAr - tovabbiKedvezmeny) * eredetiArak.kiszereles
          kedvezmenyesArak.tajekoztatoErtek = Math.ceil(kedvezmenyesArak.kiszerelesAr * arfolyam)
        }

        // Árak cseréje kedvezményesre
        kedvezmenyekTable.cell(rowIdx, 4).data(kedvezmenyesArak.kedvezmeny)
        kedvezmenyekTable.cell(rowIdx, 5).data(kedvezmenyesArak.literAr)
        kedvezmenyekTable.cell(rowIdx, 6).data(kedvezmenyesArak.kiszerelesAr)
        kedvezmenyekTable.cell(rowIdx, 7).data(kedvezmenyesArak.tajekoztatoErtek)

      })
    
    }

    // Kedvezmény mértékének beállítása
    // if (mertek >= 0){
    //   // Korábbi kedvezmény törlése
    //   let kedvezmenyekRow = kedvezmenyekTable.rows().data().filter(row => row[2] == "Kedvezmény")[0]
    //   if (kedvezmenyekRow) {
    //     kedvezmenyekTable.row(':last').remove()
    //   } 
    //   // Ha a kedvezmény mértéke nem 0, akkor hozzáadjuk a kedvezmény sort
    //   if (mertek !== 0){
    //     kedvezmenyekTable.row.add(["", "", "Kedvezmény", "", -1 * mertek + ' EUR', "", -1 * mertek + ' EUR', ""])
    //   }
    // }

    kedvezmenyekTable.draw();
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


  // Fizetési mód függvényében jelenítjük meg az "utalas_eddig" mezőt
  $('#fizetesi_mod').on('change', function(){
    
    let utalas_eddig = $('#utalas_eddig').parent().parent()
    
    if (this.value == 'Halasztott utalás'){
      utalas_eddig.removeClass('d-none')
                  .addClass('d-block')
    } else {
      utalas_eddig.removeClass('d-block')
                  .addClass('d-none')
    }
  })
  

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