import BasePoi from "./base_poi.mjs";
import iconv from "iconv-lite";
import Log from "./logger.mjs";
import encoding from 'encoding-japanese';
import { promises as fs } from "fs";
import fsx from "fs";
import path from "path";
import {axios_instance} from "./util.mjs";
const config = global.covid19map.config;

const ALTER_CITY_NAMES = [
  ['善通寺', '善通寺市']
];

async function parse_html( html_, pref_name )
{
  function array2Csv( array ){
    let csvFormat='';
    for( const item of array){
      mon = item[0].getMonth() + 1;
      day = item[0].getDate();
      city = item[1];
      csvFormat += mon + "/" + day + "," + city + "\n";
    }
    return csvFormat;
  }
  // json/past/香川県フォルダを作る
  const pastCsvDir = path.join(config.ROOT_DIRECTORY, `${config.SERVER_MAKE_DATA_PAST_DIR}/${pref_name}`);
  if( fsx.existsSync( pastCsvDir )){
    // Log.info( "file exist");
  }else{
    await fs.mkdir(pastCsvDir);
  }

  // 前年と前年以前のCSV ファイル名を予め読み込む 
  const pastCsv = [];
  let lastSaveYear=0;

  for( const file of await fs.readdir(pastCsvDir).catch(()=>{ LOG.debug('*** no past files')})){ 
    const yyyy = file.match(/\d{4}/)[0];  // 年度
    lastSaveYear = yyyy > lastSaveYear ? yyyy : lastSaveYear;
    const local_uri = path.join(config.ROOT_DIRECTORY, `${config.SERVER_MAKE_DATA_PAST_DIR}/${pref_name}`, file);
    let pastData = await fs.readFile( local_uri);
    pastData = iconv.decode(pastData, 'utf8');
    const list = pastData.split(/\r\n|\r|\n/); 
    for ( const item of list){
      const m = item.match(/(\d+?)\/(\d+?),(.+?)$/);       // csv のテキスト形式
      if( m == null){
        break;
      }
      pastCsv.push( [ new Date(yyyy, m[1]-1, m[2]), m[3] ] );
    }
  }

  // データをパースする
  const today = new Date();
  let year = today.getFullYear();
  let prevMon = today.getMonth() + 1;

  const csv = [];
  const re = new RegExp([
    '<tr>[\\s\\S]+?',
    '(<td>[\\s\\S]+?)<\\/tr>'].join(''), 'g');          // <tr> - </tr>  join は、RegExp()　の括弧の中を1つの文字列にする

  const detected = encoding.detect(html_.data);  // 文字コード検出
//  const _hText = encoding.convert( html.data, {
//     from:detected,
//     to:'UNICODE',
//     type: 'string' });
  const html = iconv.decode( html_.data, detected ) 
  let no, p_no=0;
  let mon, day, city;
  let rowspan_date=0;

  PARSE_BLOCK: while(true){
    const m = re.exec(html);
    if( !m )
      break;

    const m_1 = m[1].replace(/(?:\r|\n|\s{2,})/g,'')  // 見やすくするために改行とtab を削除
    const hText = m_1.split("</td>");                 // <td> - </td> ブロック
     
    let index = 0;
    //---- 通し番号
    var mm = hText[index].match(/>(\d+)/);
    if( mm != null ){
      no = mm[1];
    }else{
      Log.error("???? get no error : " + hText[index]);
    }
    index ++;
    
    //---- get date
    mm = hText[index].match(/(\d+)月(\d+)日/);
    if( mm != null){
      mon = mm[1];
      day = mm[2];
      mm = hText[index].match(/rowspan="(\d+)/);
      index ++;
      if( mm != null ){
        rowspan_date = mm[1];
      }
    }else{
      if( rowspan_date <= 1){
        Log.error("???? get date error " + no + " : " + hText[index] );
      }
      rowspan_date --;
    }

    //---- age
    index ++;
    //---- sex
    index ++;
    //---- city
  
    mm = hText[index].match(/>(.+?)$/);
    if( mm != null){
      city = mm[1].replace(/<p[\s\S]+?>/,'').replace(/<\/p>/,'').replace(/&nbsp;/g,'');
    }else{
      Log.error("???? get city error : " + no + " " + hText[index]);
    }
    if( p_no == 0){
      p_no = no;
    }else if( p_no - 1 != no){
      Log.error( "???? serial error " + no + " " + p_no) ;
    }else{
      p_no = no;
    }
    if( no == 119){
      let x = 1;
    }
    //console.log(no + " " + mon + " " + day + " " + city);

    // 前の年になった
    if( Number(prevMon) < Number(mon)){
      year --;
    }
    prevMon = mon;

    // 保存されている年のデータがあるなら、終わり。
    if( year == lastSaveYear){
      break;
    }
    csv.push( [ new Date( year, mon-1, day), city ] );
  
    if( no == 1){
      break;
    }
  }

  // 前年のデータをセーブ
  // 前年のデータが無い時もうまくいく。
  let cYear = today.getFullYear();
  let oneYearCsv = [];
  let yearCount = 0;          // 読み込んだ csv に何年分の以前の年のデータあるか調べる
  for (const data of csv ){
    const _year = data[0].getFullYear();
    if( _year == cYear ){
      oneYearCsv.push( data );
      continue;
    }
    if( yearCount == 0){
      yearCount ++;
    }else{
      // cYear の data を save
      const pastCsvFile = path.join(config.ROOT_DIRECTORY, `${config.SERVER_MAKE_DATA_PAST_DIR}/${pref_name}/${cYear}.csv`);
      const csvFormat= array2Csv(oneYearCsv);
      await fs.writeFile(pastCsvFile,  csvFormat, 'utf8', (err) => Log.error(err) );
    }
    oneYearCsv.splice(0);
    oneYearCsv.push(data);
    cYear --;
  }

  // 最後 の cYear の data を save
  if( yearCount != 0){
    const pastCsvFile = path.join(config.ROOT_DIRECTORY, `${config.SERVER_MAKE_DATA_PAST_DIR}/${pref_name}/${cYear}.csv`);
    const csvFormat= array2Csv(oneYearCsv);
    await fs.writeFile(pastCsvFile,  csvFormat);
  }
  
  // file から読み込んだ以前の年のデータを push
  pastCsv.map( item  => csv.push(item));

  return csv;
}

export default class PoiKagawa extends BasePoi
{
  static async load()
  {
    return BasePoi.process_csv( {
      pref_name: '香川県',
      alter_citys: ALTER_CITY_NAMES,
      csv_uri: config.KAGAWA_HTML.DATA_URI,
      cb_parse_csv: cr => parse_html( cr, '香川県' ),
      row_begin: 0,
      min_columns: 2,
      col_date: 0,
      col_city: 1
    } );
  }
}

