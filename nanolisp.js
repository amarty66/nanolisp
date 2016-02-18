var NANOLISP = (function() {

// alain marty | 2016/02/18 | copyleft GPL

Object.prototype.find = function (op) {
  if (this.hasOwnProperty(op))
    return this;
  else { //return this.outer.find(op);
    var o = null;
    try { o = this.outer.find(op) }
    catch (e) { o = null }
    return o;  
  } 
};

var create_env = function (args,vals,out){
  var env = {}; 
  env.outer = out || {};
  for (var i=0; i < args.length; i++)
    env[args[i]] = vals[i]; 
  return env; 
};

var dict = create_env({},{});

dict['lib'] = function () {
  var str = '', index = 0;
  for (var key in dict) {
    if(dict.hasOwnProperty(key) && (key !== 'outer')) {
      str += key + ', ';
      index++;
    }
  }
  str = str.substring(0,str.length-2);
  return index + ' primitives: ' + str; 
};

// 1) lists:
dict['length'] = function (x) { 
 return x.length; 
};
dict['cons'] = function (x, y) { 
 var arr = [x]; return arr.concat(y); 
};
dict['car'] = function (x) { 
  return (x.length !== 0) ? x[0] : null; 
};
dict['cdr'] = function (x) { 
  return (x.length > 1) ? x.slice(1) : null; 
}; 
dict['append'] = function (x, y) { 
  return x.concat(y); 
};
dict['list'] = function () {
  return Array.prototype.slice.call(arguments); 
}; 
dict['join'] = function () {
  return Array.prototype.slice.call(arguments).join('');
};
dict['disp'] = function () { 
  var str = JSON.stringify( arguments[0] );
  return JSON2list( str );
};
dict['list?'] = function (x) {
  return x && typeof x === 'object' 
           && x.constructor === Array ; 
}; 
dict['null?'] = function (x) { 
  return (!x || x.length === 0); 
};
dict['symbol?'] = function (x) { 
  return typeof x === 'string'; 
}; 

// 2) maths: 
dict['lt'] = function() {
  return arguments[0] < arguments[1]
};
dict['gt'] = function() {
  return arguments[0] > arguments[1]
};
dict['='] = function() {
  var a = arguments[0], b = arguments[1];
  return !(a < b) && !(b < a)
};
dict['+'] = function() {
  for (var r= 0, i=0; i< arguments.length; i++)
    r += parseFloat( arguments[i] );
  return r;
};
dict['*'] = function() {
  for (var r= 1, i=0; i< arguments.length; i++)
    r *= arguments[i];
  return r;
};
dict['-'] = function() {
  return arguments[0] - arguments[1];
};
dict['/'] = function() {
  return arguments[0] / arguments[1];
};
dict['%'] = function() {
  return arguments[0] % arguments[1];
};

var mathtags = ['abs', 'acos', 'asin', 'atan', 'ceil', 'cos', 'exp', 'floor', 
'log', 'random', 'round', 'sin', 'sqrt', 'tan', 'min', 'max'];
for (var i=0; i< mathtags.length; i++) {
  dict[mathtags[i]] = function(tag) {
    return function() { 
      return tag.apply( null, arguments );}
  }(Math[mathtags[i]]); 
}

// 3) html:
// 3.1) out of alphawiki:
var htmltags = ['div', 'span', 'a', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'table',
 'tr', 'td', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'b', 'i', 'u', 'center', 
'br', 'hr', 'blockquote', 'sup', 'sub', 'del', 'code', 'img', 'pre'];

dict['@'] = function() {
  return '@@' + [].slice.call(arguments).join(' ') + '@@';
};

for (var i=0; i< htmltags.length; i++) {
  dict[htmltags[i]] = function(tag) {
    return function() {
      var args = [].slice.call(arguments).join(' ');
      var attr = args.match( /@@[\s\S]*?@@/ ); 
      if (attr == null) 
        return '<'+tag+'>'+args+'</'+tag+'>';
      args = args.replace( attr[0], '' ).trim();
      attr = attr[0].replace(/@@/g, '');
      return '<'+tag+' '+attr+'>'+args+'</'+tag+'>';
    }
  }(htmltags[i]);  
}
// 3.2) in alphawiki:
/*
var htmltags = ['@', 'div', 'span', 'a', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'table', 'tr', 'td', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'b', 'i', 'u', 'center', 'br', 'hr', 'blockquote', 'sup', 'sub', 'del', 'code', 'img', 'pre'];

for (var i=0; i< htmltags.length; i++) {
  dict[htmltags[i]] = function(tag) {
    return function() {
      var args = [].slice.call(arguments);
      var str = '{' + tag + ' ' + args.join(' ') + '}';
      return LAMBDATALK.eval_sexprs(str);  
    }
  }(htmltags[i]);  
}
*/

// 4) useful things
var JSON2list = function( str ) {
  // "["\"a\"","34","56","78","90"]" -> (a 34 56 78 90)
  return str.replace(/"/g, '')
            .replace(/,/g, ' ')
            .replace( /\\/g, '' );
};
var brakets2parens = function(str) {
  // [a b c] -> (a b c) 
  // rotate[-15deg] -> rotate(-15deg) , ...
  return str.replace(/\[/g,'(')
            .replace(/\]/g,')');
};

// 5) evaluation, where everything is handled:
var do_eval = function (x, env) {
  env = env || dict;
  if ( !isNaN(parseFloat(x)) && isFinite(x) ) {
    return x;
  } else if ( typeof x === 'string' ) {
      //return env.find(x)[x];
      var e = env.find(x);
      return ( e !== null ) ? e[x] : x;
  } else if ( x[0] === 'q' ) {
      return JSON2list( JSON.stringify( x[1] ) ) 
  } else if ( x[0] === 'if' ) {
      return do_eval( 
            (do_eval( x[1], env)? x[2] : x[3]), env ); 
  } else if (x[0] === 'def' ) {
      env[x[1]] = do_eval( x[2], env );  
      return '> ' + x[1];
  } else if ( x[0] === 'lambda' ) {
      return function () { 
      var new_env = create_env( x[1], arguments, env );
      return do_eval( x[2], new_env ); 
    }  
  } else {
      for (var xx = [], i=0; i< x.length; i++)
        xx[i] = do_eval( x[i], env ); 
      var func = xx.shift();
      return func.apply(null, xx); 
  }
};
var build_tree = function(tokens) {
  var token = tokens.shift();
  if (token !== '(') 
    return token;
  var arr = [];
  while (tokens[0] !== ')')
    arr.push( build_tree(tokens) ); 
  tokens.shift();
  return arr;
};
var tokenize = function( s ) {
  return s.replace(/\(/g, ' ( ')
          .replace(/\)/g, ' ) ')
          .trim()
          .split(/\s+/);         
};
var evaluate = function( str ) {
  return do_eval( build_tree( tokenize( str )))
};
var balance = function ( str ) {
  var acc_open  = str.match( /\(/g );
  var acc_close = str.match( /\)/g );
  var nb_acc_open  = (acc_open)?  acc_open.length : 0;
  var nb_acc_close = (acc_close)? acc_close.length : 0;
  return [nb_acc_open, nb_acc_close]; 
};
var parser = function ( str ) { 
  var  t0 = new Date().getTime();
  var bal = balance( str );
  str = (bal[0] === bal[1])? evaluate( '(div ' + str + ')' ) : '';
  str = brakets2parens( str );
  var  t1 = new Date().getTime();
  return { val:str, infos:[bal[0], bal[1], t1-t0] };
};

return {parser:parser}
})();

// HTML interface

function update() { 
  var input = document.getElementById('input').value;
  var output = NANOLISP.parser( input );
  if (output.val != '')
    document.getElementById('output').innerHTML =
      output.val;
  document.getElementById('infos').innerHTML = 
    output.infos[2] + ' ms (' + 
    output.infos[0] + '|' + output.infos[1] + ')';
}

