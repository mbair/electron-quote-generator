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
    $text.find('em').text('K??sz');

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
      `Term??kek sikeresen beolvasva,`
      //`${processedItemsCount} term??k sikeresen beolvasva,`,
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
          e[0], // SAP k??d: Kalkul??ci?? A oszlopa
          e[1], // Term??kn??v: Kalkul??ci?? H oszlopa
          e[2], // Kiszerel??s: Kalkul??ci?? J oszlopa
          e[3], // ??tad??si ??r: Kalkul??ci?? S oszlopa
          e[4], // ??tad??si ??r EUR/kiszerel??s: kiszerel??s ??s a EUR/l szorzata
          e[5], // T??j??koztat?? ??rt??k HUF
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

// Men?? m??k??dtet??s
const menuHandler = (target) => {

  if (typeof target == 'string'){
    target = $('a[href="'+ target +'"]')
  }

  if ($(target).hasClass('active')) return;

  // T??bbi men?? elem aktiv??t??s??nak megsz??ntet??se
  $('.nav-link').each((i,obj) => $(obj).removeClass('active'));

  // Men?? elem akt??vv?? t??tele
  $(target).addClass('active');

  // T??bbi szekci?? elrejt??se
  $('section').each((i,obj) => $(obj).hide());

  // K??v??nt szekci?? megjelen??t??se
  let section = $(target).attr('href');
  $(section).show();
}

// Men??pontra kattint??s
window.addEventListener('click', event => {
  const target = event.target

  // Men?? elemre kattint??s
  if ($(target).hasClass('nav-link')){
    menuHandler(target)
  }
})

const discountPrice = (price, percentage, decimals = 0) => {
  if (!price) return

  // Set Discount price decimals
  price = price * ((100 - percentage) / 100)
  price = price.toFixed(decimals)

  // Thousand separated discount price
  // price = price.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, " ")

  return price
}

const currencyFormatHU = (num, decimals = 0) => {
  if (!num) return

  // Ha m??r be??ll??tottuk a form??tumot
  if (typeof num === "string" && [',',' '].some(el => num.includes(el))){
    return num
  }

  return (Number(num)
          .toFixed(decimals) // always two decimal digits
          .toString()
          .replace('.', ',') // replace decimal point character with ,
          .replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1 ')
  )
}

/**
 * Oldal bet??lt??s
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
    // "bFilter": false, // Keres??s
    columnDefs: [ 
      {
        targets: 0,
        orderable: false,
        className: 'select-checkbox',
      },
      {
        targets: 1,
        width: '80px'
      },
      {
        targets: 2,
        width: '400px'
      },
      {
        targets: 3,
        width: '100px'
      },
      {
        targets: 4,
        width: '350px'
      },
      {
        targets: 5,
        width: '150px'
      },
      {
        targets: 6,
        width: '250px'
      },
      {
        targets: [1, 3, 4, 5, 6],
        className: 'dt-body-right',
      },
      {
        targets: [4, 5],
        render: $.fn.dataTable.render.number( ' ', ',', 2, '' )
      },
      {
        targets: [3, 6],
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

              // let cellWidth = 2 * Math.ceil($(cell).width());
              // cellWidth = '100%';
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
        targets: [5, 6],
        render: $.fn.dataTable.render.number( ' ', ',', 2, '' )
      },
      {
        targets: [3, 7],
        render: $.fn.dataTable.render.number( ' ', ',', 0, '' )
      },
    ],
    createdRow: function(row, data, dataIndex) {
      if (data[2] == "Kedvezm??ny"){
        $(row).addClass('kedvezmeny-sor').addClass('no-select')
        $(row).find("td:first").attr('class', '')
      }
    },
    buttons: [
      'selectAll',
      'selectNone',
      {
        text: 'Kedvezm??ny be??ll??t??sa',
        attr:  {
          title: 'Kedvezm??ny be??ll??t??sa',
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
        text: 'PDF ment??s',
        extend: 'pdfHtml5',
        filename: '??raj??nlat ' + new Date().toISOString().slice(0, 10),
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
            
            // ??rt??kes??t??
            ertekesito_nev: 'Binder Zolt??n',
            ertekesito_osztaly: 'Teszt oszt??ly',
            ertekesito_email: 'binder.zoltan@lubexpert.hu',
            ertekesito_kozvetlen_szam: '+36 20/296-9911',
            ertekesito_fax: '+36 27/343-746',

            // ??gyf??l
            ugyfel_nev: 'Kepecz Norbert',
            cegnev: 'Partner Aut??alkatr??sz Piac Kft.',
            irsz: '7630',
            varos: 'P??cs',
            utca: 'Moh??csi ??t 14.',
            email: 'n.kepecz@partnerauto.hu',
            telefon: '30/929-4606',
            fax: '1235678',
            
            // Aj??nlat
            szallitasi_forma: 'Kisz??ll??t??st k??r',
            ervenyesseg: '30 nap',
            fizetesi_mod: 'Halasztott utal??s',
            utalas_eddig: '15 nap',
          }

          // for (const [key, value] of Object.entries(tesztAdatok)) {
          //   $('#'+key).val(value)
          // }

          // V??ltoz??k cser??je az ??raj??nlat sablonban
          let fromTo = {

            // PDF log??k
            '%lubexpertLogo%': lubexpertLogo,
            '%isoLogo%': isoLogo,
            '%mobil1Logo%': mobil1Logo,
            '%lablecLogo%': lablecLogo,

            // ??rt??kes??t??
            '%ertekesito_nev%': $('#ertekesito_nev').val(),
            '%ertekesito_osztaly%': $('#ertekesito_osztaly').val(),
            '%ertekesito_email%': $('#ertekesito_email').val(),
            '%ertekesito_kozvetlen_szam%': $('#ertekesito_kozvetlen_szam').val(),
            '%ertekesito_fax%': $('#ertekesito_fax').val(),

            // ??gyf??l
            '%ugyfel_nev%': $('#ugyfel_nev').val(),
            '%cegnev%': $('#cegnev').val(),
            '%varos%': $('#varos').val(),
            '%utca%': $('#utca').val(),
            '%irsz%': $('#irsz').val(),
            '%email%': $('#email').val(),
            '%telefon%': $('#telefon').val(),
            '%fax%': $('#fax').val(),

            // Aj??nlat
            '%szallitas_text%': $('#szallitasi_forma').val() == '??rte j??n' ? '' : 'A sz??ll??t??s d??jmentes.',
            '%evernyesseg%': $('#ervenyesseg').val(),
            '%fizetesi_mod%': $('#fizetesi_mod').val(),
            '%hatarido%': $('#fizetesi_mod').val() == 'El??re utal??s' ? '0 nap' : $('#utalas_eddig').val(),
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

          // PDF T??bl??zat felt??lt??se a kedvezm??ny t??bl??zat soraival
          let pdfTermekek = [template[7]['table']['body'][0]]
          kedvezmenyekTable.data().map(row => {

            // Magyar sz??mform??tum haszn??lata
            row[5] = currencyFormatHU(row[5], 2)
            row[6] = currencyFormatHU(row[6], 2)
            row[7] = currencyFormatHU(row[7])

            pdfTermekek.push([
              { text: row[1], alignment: 'right' }, // SAP k??d
              { text: row[2], alignment: 'left'  }, // Term??kn??v
              { text: row[3], alignment: 'right' }, // Kiszerel??s (L, Kg)
              { text: row[5], alignment: 'right' }, // Term??k nett?? ??tad??si ??ra (EUR/L, Kg)
              { text: row[6], alignment: 'right' }, // Nett?? ??tad??si ??r (EUR/kiszerel??s)
              { text: row[7], alignment: 'right' }, // T??j??koztat?? nett?? ??r (HUF/kiszerel??s)
            ])
          })
          
          template[7]['table']['body'] = pdfTermekek
          
          doc.content[1] = template
        }
      }] 
  })
  
  var kedvezmenyekTable = $('#kedvezmenyek-table').DataTable(kedvezmenyekTableConfig)

  // T??bl??k szinkroniz??l??sa sor kijel??l??se, vagy kijel??l??s megsz??ntet??se eset??n
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
        selectedTetelek[i][1], // SAP k??d: Kalkul??ci?? A oszlopa
        selectedTetelek[i][2], // Term??kn??v: Kalkul??ci?? H oszlopa
        selectedTetelek[i][3], // Kiszerel??s: Kalkul??ci?? J oszlopa
        "",                    // Kedvezm??ny
        selectedTetelek[i][4], // ??tad??si ??r: Kalkul??ci?? S oszlopa
        selectedTetelek[i][5], // ??tad??si ??r EUR/kiszerel??s: kiszerel??s ??s a EUR/l szorzata
        selectedTetelek[i][6], // T??j??koztat?? nett?? ??r HUF
      ]).draw();
    }
  }

  // Sor kijel??l??se, vagy kijel??l??s megsz??ntet??se
  ['select', 'deselect'].forEach(event => {
    tetelekTable.on(event, syncTables)
  });

  /**
   * Kedvezm??nyek ment??se
   */
  const kedvezmenySave = () => {
    
    let szazalek = parseInt($('#kedvezmeny-szazalek').val()) || 0;
    let raklapos = $('#raklapos-tetel').is(':checked');
    let erteJon = $('#szallitasi_forma').val() == '??rte j??n';
    let arfolyam = parseInt($('#arfolyam').text());
    // let mertek = parseInt($('#kedvezmeny-mertek').val()) || 0;

    // Kedvezm??ny %-??nak be??ll??t??sa
    if (0 <= szazalek && szazalek <= 30) {

      // A kijel??lt sorokra alkalmazzuk a %-os kedvezm??nyt
      let rows = kedvezmenyekTable.rows({selected: true})

      // Kedvezm??ny alkalmaz??sa a t??bl??zat soraira
      rows.every(function (rowIdx, tableLoop, rowLoop) {
          
        let termekNev = kedvezmenyekTable.cell(rowIdx, 1).data()
        let tovabbiKedvezmeny = 0

        // Sor azonos??t??sa term??kn??v szerint
        let row = tetelekTable.rows().data().filter(row => row[1] == termekNev)[0]
        if (!row) return

        // Eredeti ??rak
        let eredetiArak = {
          literAr: row[4],
          kiszereles: row[3], 
          kiszerelesAr: row[5],
          tajekoztatoErtek: row[6],
        }

        // Kedvezm??nyes ??rak (2 tizedesjegyre kerek??tve)
        let kedvezmenyesArak = {
          kedvezmeny: szazalek != 0 ? ' + ' + szazalek + '%' : '',
          literAr: discountPrice(eredetiArak.literAr, szazalek, 2),
          kiszerelesAr: discountPrice(eredetiArak.literAr, szazalek, 2),
          tajekoztatoErtek: discountPrice(eredetiArak.tajekoztatoErtek, szazalek),
        }

        // Raklapos t??telek kedvezm??nye (EUR/L ??rb??l lej??n tov??bbi 0.05 EUR)
        // Ha ??rte j??n, akkor tov??bbi 0.09 EUR lej??n, a kedvezm??nyek ??sszevon??dnak
        if (raklapos || erteJon) {
          
          if (raklapos) tovabbiKedvezmeny += 0.05
          if (erteJon) tovabbiKedvezmeny += 0.09 

          kedvezmenyesArak.kedvezmeny = (tovabbiKedvezmeny > 0 && tovabbiKedvezmeny + ' EUR') + kedvezmenyesArak.kedvezmeny
          kedvezmenyesArak.literAr = kedvezmenyesArak.literAr - tovabbiKedvezmeny
          kedvezmenyesArak.kiszerelesAr = (kedvezmenyesArak.kiszerelesAr - tovabbiKedvezmeny) * eredetiArak.kiszereles
          kedvezmenyesArak.tajekoztatoErtek = Math.ceil(kedvezmenyesArak.kiszerelesAr * arfolyam)
        }

        // ??rak cser??je kedvezm??nyesre
        kedvezmenyekTable.cell(rowIdx, 4).data(kedvezmenyesArak.kedvezmeny)
        kedvezmenyekTable.cell(rowIdx, 5).data(kedvezmenyesArak.literAr)
        kedvezmenyekTable.cell(rowIdx, 6).data(kedvezmenyesArak.kiszerelesAr)
        kedvezmenyekTable.cell(rowIdx, 7).data(kedvezmenyesArak.tajekoztatoErtek)
        
      })
    
    }

    // Kedvezm??ny m??rt??k??nek be??ll??t??sa
    // if (mertek >= 0){
    //   // Kor??bbi kedvezm??ny t??rl??se
    //   let kedvezmenyekRow = kedvezmenyekTable.rows().data().filter(row => row[2] == "Kedvezm??ny")[0]
    //   if (kedvezmenyekRow) {
    //     kedvezmenyekTable.row(':last').remove()
    //   } 
    //   // Ha a kedvezm??ny m??rt??ke nem 0, akkor hozz??adjuk a kedvezm??ny sort
    //   if (mertek !== 0){
    //     kedvezmenyekTable.row.add(["", "", "Kedvezm??ny", "", -1 * mertek + ' EUR', "", -1 * mertek + ' EUR', ""])
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


  // Fizet??si m??d f??ggv??ny??ben jelen??tj??k meg az "utalas_eddig" mez??t
  $('#fizetesi_mod').on('change', function(){
    
    let utalas_eddig = $('#utalas_eddig').parent().parent()
    
    if (this.value == 'Halasztott utal??s'){
      utalas_eddig.removeClass('d-none')
                  .addClass('d-block')
    } else {
      utalas_eddig.removeClass('d-block')
                  .addClass('d-none')
    }
  })

  // Sz??ll??t??si forma szerint ??rv??nyes??tj??k a kedvezm??nyt a term??kekre
  $('#szallitasi_forma').on('change', function(){
    kedvezmenyekTable.rows().select()
    kedvezmenySave()
    kedvezmenyekTable.rows().deselect()
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