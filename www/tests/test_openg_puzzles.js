//
// Tests for op engine puzzles.
//
// Copyright (c) The Dojo Foundation 2011. All Rights Reserved.
// Copyright (c) IBM Corporation 2008, 2011. All Rights Reserved.
//
dojo.provide('tests.test_openg_puzzles');
dojo.require('tests.util');

module('op engine puzzles', {
    teardown: function() {
        // clean up all clients
        tests.util.OpEngClient.all_clients = [];
    }
});

test('two site multiple topics', 2, function() {
    var a = new tests.util.OpEngClient(0, {abc : '', xyz : ''});
    var b = new tests.util.OpEngClient(1, {abc : '', xyz : ''});
    var op;
    op = a.local('abc', '1', 'insert', 0);
    a.send(op);
    op = b.local('xyz', '2', 'insert', 0);
    b.send(op);
    op = b.local('xyz', '3', 'update', 0);
    b.send(op);
    
    a.recvAll();
    b.recvAll();
        
    op = a.local('xyz', null, 'delete', 0);
    a.send(op);
    op = a.local('abc', '4', 'update', 0);
    a.send(op);
    op = b.local('xyz', '5', 'update', 0);
    b.send(op);
    op = b.local('abc', '6', 'update', 0);
    b.send(op);
    op = b.local('xyz', '7', 'update', 0);
    b.send(op);
    
    a.recvAll();
    b.recvAll();
    
    var correct = {abc : '4', xyz : ''};
    deepEqual(a.state, correct, 'client state check');
    deepEqual(b.state, correct, 'client state check');
});

test('two site puzzle #1', 4, function() {
    var a = new tests.util.OpEngClient(0, {symbol : 'IBM'});
    var b = new tests.util.OpEngClient(1, {symbol : 'IBM'});
    var a1 = a.local('symbol', 'JAVA', 'update', -1);
    var b1 = b.local('symbol', 'MSFT', 'update', -1);
    var b2 = b.local('symbol', 'GOOG', 'update', -1);

    var b1r = a.remote(b1);
    var b2r = a.remote(b2);
    var a1r = b.remote(a1);

    var correct = {symbol : 'JAVA'};
    deepEqual(a.state, correct, 'client state check');
    equals(a.eng.getBufferSize(), 3);
    deepEqual(b.state, correct, 'client state check');
    equals(b.eng.getBufferSize(), 3);
});

test('three site puzzle false-tie', 6, function() {
    var a = new tests.util.OpEngClient(0, {text : 'abc'});
    var b = new tests.util.OpEngClient(1, {text : 'abc'});
    var c = new tests.util.OpEngClient(2, {text : 'abc'});

    var a1 = a.local('text', '1', 'insert', 1);
    var b1 = b.local('text', null, 'delete', 1);
    var c1 = c.local('text', '2', 'insert', 2);
    
    a.remote(c1);
    a.remote(b1);
    
    b.remote(a1);
    b.remote(c1);
    
    c.remote(b1);
    c.remote(a1);
    
    var correct = {text : 'a12c'};
    dojo.forEach([a,b,c], function(e) {
        deepEqual(e.state, correct, 'client state check');
        equals(e.eng.getBufferSize(), 3, 'history buffer size check');
    });
});


test('three site puzzle #1', 6, function() {
    var a = new tests.util.OpEngClient(0, {text : 'abc'});
    var b = new tests.util.OpEngClient(1, {text : 'abc'});
    var c = new tests.util.OpEngClient(2, {text : 'abc'});

    var a1 = a.local('text', 'x', 'insert', 2);
    var a2 = a.local('text', null, 'delete', 3);
    var b1 = b.local('text', null, 'delete', 1);
    var b2 = b.local('text', 'z', 'insert', 0);
    var c1 = c.local('text', null, 'delete', 1);
    var c2 = c.local('text', 'y', 'insert', 2);
    
    var list = [b1, b2, c1, c2];
    dojo.forEach(list, function(op) {
        a.remote(op);
    });

    list = [a1, a2, c1, c2];
    dojo.forEach(list, function(op) {
        b.remote(op);
    });

    list = [a1, a2, b1, b2];
    dojo.forEach(list, function(op) {
        c.remote(op);
    });
    
    var correct = {text : 'zaxy'};
    dojo.forEach([a,b,c], function(e) {
        deepEqual(e.state, correct, 'client state check');
        equals(e.eng.getBufferSize(), 6, 'history buffer size check');
    });
});

test('three site puzzle #2', 6, function() {
    var sites = [];
    var op;
    sites.push(new tests.util.OpEngClient(0,{"topic1":"m"}));
    sites.push(new tests.util.OpEngClient(1,{"topic1":"m"}));
    sites.push(new tests.util.OpEngClient(2,{"topic1":"m"}));

    op = sites[1].local("topic1", "M", "update", 0);    // [1,1] in [0,0,0] now M
    sites[1].send(op);
    op = sites[2].local("topic1", null, "delete", 0);   // [2,1] in [0,0,0] now 0
    sites[2].send(op);
    op = sites[0].local("topic1", "f", "insert", 1);    // [0,1] in [0,0,0] now mf
    sites[0].send(op);    
    op = sites[1].local("topic1", "u", "insert", 0);    // [1,2] in [0,1,0] now uM
    sites[1].send(op);

    sites[0].recvAll();
    sites[2].recvAll();

    // receive delete [2,1] in [0,0,0] now u
    sites[1].recv();

    // receive insert [0,1] in [0,0,0] now uf
    sites[1].recv();
    
    var correct = {topic1 : 'uf'};
    dojo.forEach(sites, function(e, i) {
        e.recvAll();
        var eng = e.eng;
        deepEqual(e.state, correct, 'client state check');
        equals(e.eng.getBufferSize(), 4, 'history buffer size check');
    });
});

test('three site puzzle #3', 6, function() {
    var sites = [];
    var op;
    sites.push(new tests.util.OpEngClient(0,{"topic1":"tb"}));
    sites.push(new tests.util.OpEngClient(1,{"topic1":"tb"}));
    sites.push(new tests.util.OpEngClient(2,{"topic1":"tb"}));

    op = sites[1].local("topic1", "b", "insert", 1);
    sites[1].send(op);
    sites[0].recv();
    op = sites[0].local("topic1", "T", "update", 0);
    sites[0].send(op);
    op = sites[0].local("topic1", "Q", "insert", 1);
    sites[0].send(op);
    op = sites[2].local("topic1", "V", "insert", 0);
    sites[2].send(op);
    sites[2].recv();
    sites[1].recv();
    op = sites[1].local("topic1", "B", "update", 1);
    sites[1].send(op);
    op = sites[1].local("topic1", null, "delete", 0);
    sites[1].send(op);

    var correct = {topic1 : 'VQBb'};
    dojo.forEach(sites, function(e, i) {
        e.recvAll();
        var eng = e.eng;
        deepEqual(e.state, correct, 'client state check');
        equals(e.eng.getBufferSize(), 6, 'history buffer size check');
    });
});

test('three site puzzle #4', 6, function() {
    var sites = [];
    var op;
    sites.push(new tests.util.OpEngClient(0,{"topic1":"ze"}));
    sites.push(new tests.util.OpEngClient(1,{"topic1":"ze"}));
    sites.push(new tests.util.OpEngClient(2,{"topic1":"ze"}));

    op = sites[2].local("topic1", null, "delete", 1);
    sites[2].send(op);
    op = sites[2].local("topic1", "D", "insert", 0);
    sites[2].send(op);
    op = sites[1].local("topic1", "k", "insert", 1);
    sites[1].send(op);
    op = sites[0].local("topic1", null, "delete", 0);
    sites[0].send(op);
    
    var correct = {topic1 : 'Dk'};
    dojo.forEach(sites, function(e, i) {
        e.recvAll();
        var eng = e.eng;
        deepEqual(e.state, correct, 'client state check');
        equals(e.eng.getBufferSize(), 4, 'history buffer size check');
    });
});

test('three site puzzle #5', 6, function() {
    var sites = [];
    var op;
    sites.push(new tests.util.OpEngClient(0,{"topic1":""}));
    sites.push(new tests.util.OpEngClient(1,{"topic1":""}));
    sites.push(new tests.util.OpEngClient(2,{"topic1":""}));
    op = sites[0].local("topic1", "A", "insert", 0);
    sites[0].send(op);
    op = sites[0].local("topic1", null, "delete", 0);
    sites[0].send(op);
    op = sites[1].local("topic1", "l", "insert", 0);
    sites[1].send(op);
    op = sites[2].local("topic1", "E", "insert", 0);
    sites[2].send(op);
    sites[2].recv();
    op = sites[2].local("topic1", "Y", "insert", 0);
    sites[2].send(op);

    var correct = {topic1 : 'YlE'};
    dojo.forEach(sites, function(e, i) {
        e.recvAll();
        var eng = e.eng;
        deepEqual(e.state, correct, 'client state check');
        equals(e.eng.getBufferSize(), 5, 'history buffer size check');
    });
});

test('three site puzzle #6', 6, function() {
    var sites = [];
    var op;
    sites.push(new tests.util.OpEngClient(0,{"topic1":"ab"}));
    sites.push(new tests.util.OpEngClient(1,{"topic1":"ab"}));
    sites.push(new tests.util.OpEngClient(2,{"topic1":"ab"}));

    op = sites[2].local("topic1", "c", "insert", 0);    // [2,1] in [0,0,0] now cab
    sites[2].send(op);
    op = sites[1].local("topic1", null, "delete", 0);   // [1,1] in [0,0,0] now b
    sites[1].send(op);
    sites[0].recv();                                    // recv [2,1] now [0,0,1] and cab
    op = sites[0].local("topic1", "C", "insert", 0);    // [0,1] in [0,0,1] now Ccab
    sites[0].send(op);
    
    // equals(sites[0].state.topic1, 'Ccab');
    // equals(sites[1].state.topic1, 'b');
    // equals(sites[2].state.topic1, 'cab');
    // 
    op = sites[0].local("topic1", "d", "insert", 2);    // [0,2] in [1,0,1] now Ccdab
    sites[0].send(op);
    sites[1].recv();                                    // recv [2,1] now [0,1,1] and cb
    
    // equals(sites[0].state.topic1, 'Ccdab');
    // equals(sites[1].state.topic1, 'cb');
    // equals(sites[2].state.topic1, 'cab');
    
    op = sites[2].local("topic1", "e", "insert", 0);    // [2,2] in [0,0,1] now ecab
    sites[2].send(op);
    op = sites[1].local("topic1", null, "delete", 0);   // [1,2] in [0,1,1] now b
    sites[1].send(op);

    // sanity check before conflict resolution
    // site 0: Ccdab in [2,0,1]
    // site 1: b in [0,2,1]
    // site 2: ecab in [0,0,2]
    // equals(sites[0].state.topic1, 'Ccdab');
    // var cv = new coweb.jsoe.pbs.jsoe.ContextVector({sites : [2,0,1]});
    // equals(sites[0].eng.cv.compare(cv), 0);
    // equals(sites[1].state.topic1, 'b');
    // cv = new coweb.jsoe.pbs.jsoe.ContextVector({sites : [0,2,1]});
    // equals(sites[1].eng.cv.compare(cv), 0);
    // equals(sites[2].state.topic1, 'ecab');
    // cv = new coweb.jsoe.pbs.jsoe.ContextVector({sites : [0,0,2]});
    // equals(sites[2].eng.cv.compare(cv), 0);
    
    // ******************* site #0 receive remaining

    sites[0].recv();                                    // recv [1,1] now [2,1,1] and Ccdb
    // equals(sites[0].state.topic1, 'Ccdb');
    // cv = new coweb.jsoe.pbs.jsoe.ContextVector({sites : [2,1,1]});
    // equals(sites[0].eng.cv.compare(cv), 0);
    
    // @debug: d winds up before e because of position difference
    // console.log('*******');
    // uow.trace.start(tests.util.transformLog);
    sites[0].recv();                                    // recv [2,2] now [2,1,2] and Cecdb
    // uow.trace.stop();
    // console.log('*******');
    // equals(sites[0].state.topic1, 'Cecdb');
    // cv = new coweb.jsoe.pbs.jsoe.ContextVector({sites : [2,1,2]});
    // equals(sites[0].eng.cv.compare(cv), 0);
    
    sites[0].recv();                                    // recv [1,2] now [2,2,2] and Cedb
    // equals(sites[0].state.topic1, 'Cedb');
    // cv = new coweb.jsoe.pbs.jsoe.ContextVector({sites : [2,2,2]});
    // equals(sites[0].eng.cv.compare(cv), 0);    
    
    // ******************* site #1 receive remaining
    
    sites[1].recv();                                    // recv [0,1] now [1,2,1] and Cb
    // equals(sites[1].state.topic1, 'Cb');
    // cv = new coweb.jsoe.pbs.jsoe.ContextVector({sites : [1,2,1]});
    // equals(sites[1].eng.cv.compare(cv), 0);
    
    sites[1].recv();                                    // recv [0,2] now [2,2,1] and Cdb
    // equals(sites[1].state.topic1, 'Cdb');
    // cv = new coweb.jsoe.pbs.jsoe.ContextVector({sites : [2,2,1]});
    // equals(sites[1].eng.cv.compare(cv), 0);
    
    // @debug: e winds up before d because of orig context tie breaker
    // console.log('*******');
    // uow.trace.start(tests.util.transformLog);
    sites[1].recv();                                    // recv [2,2] now [2,2,2] and Cedb
    // uow.trace.stop();
    // console.log('*******');
    // equals(sites[1].state.topic1, 'Cedb');
    // cv = new coweb.jsoe.pbs.jsoe.ContextVector({sites : [2,2,2]});
    // equals(sites[1].eng.cv.compare(cv), 0, 'context check');

    // ******************* site #2 receive remaining
    
    sites[2].recv();                                    // recv [1,1] now [0,1,2] and ecb
    // equals(sites[2].state.topic1, 'ecb');
    // cv = new coweb.jsoe.pbs.jsoe.ContextVector({sites : [0,1,2]});
    // equals(sites[2].eng.cv.compare(cv), 0);
    
    sites[2].recv();                                    // recv [0,1] now [1,1,2] and Cecb
    // equals(sites[2].state.topic1, 'Cecb');
    // cv = new coweb.jsoe.pbs.jsoe.ContextVector({sites : [1,1,2]});
    // equals(sites[2].eng.cv.compare(cv), 0);

    // @debug: d winds up before e because of position difference
    // console.log('*******');
    // uow.trace.start(tests.util.transformLog);
    sites[2].recv();                                    // recv [0,2] now [2,1,2] and Cecdb
    // console.log('*******');
    // uow.trace.stop();
    // equals(sites[2].state.topic1, 'Cecdb');
    // cv = new coweb.jsoe.pbs.jsoe.ContextVector({sites : [2,1,2]});
    // equals(sites[2].eng.cv.compare(cv), 0);

    sites[2].recv();                                    // recv [1,2] now [2,2,2] and Cedb
    // equals(sites[2].state.topic1, 'Cedb');
    // cv = new coweb.jsoe.pbs.jsoe.ContextVector({sites : [2,2,2]});
    // equals(sites[2].eng.cv.compare(cv), 0);

    var correct = {topic1 : 'Cedb'};
    dojo.forEach(sites, function(e, i) {
        e.recvAll();
        var eng = e.eng;
        deepEqual(e.state, correct, 'client state check');
        equals(e.eng.getBufferSize(), 6, 'history buffer size check');
    });
});

test('four site puzzle #1', 8, function() {
    var sites = [];
    var op;
    sites.push(new tests.util.OpEngClient(0,{"topic1":"ab"}));
    sites.push(new tests.util.OpEngClient(1,{"topic1":"ab"}));
    sites.push(new tests.util.OpEngClient(2,{"topic1":"ab"}));
    sites.push(new tests.util.OpEngClient(3,{"topic1":"ab"}));

    op = sites[2].local("topic1", "c", "insert", 0);
    sites[2].send(op);
    op = sites[3].local("topic1", "f", "insert", 0);
    sites[3].send(op);
    op = sites[1].local("topic1", null, "delete", 0);
    sites[1].send(op);
    sites[0].recv(); 
    op = sites[0].local("topic1", "C", "insert", 0);
    sites[0].send(op);
    sites[0].recv();

    op = sites[0].local("topic1", "d", "insert", 2);
    sites[0].send(op);
    sites[1].recv();
    
    op = sites[2].local("topic1", "e", "insert", 0);
    sites[2].send(op);
    op = sites[1].local("topic1", null, "delete", 0);
    sites[1].send(op);

    var correct = {topic1 : 'Cedfb'};
    dojo.forEach(sites, function(e, i) {
        e.recvAll();
        var eng = e.eng;
        deepEqual(e.state, correct, 'client state check');
        equals(e.eng.getBufferSize(), 7, 'history buffer size check');
    });
});