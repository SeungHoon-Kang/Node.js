const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
app.use(bodyParser.urlencoded({extended : true}));
const methondOverride = require('method-override')
app.use(methondOverride('_method'))
app.set('view engine', 'ejs');





var db;

MongoClient.connect('mongodb+srv://koriseung:xpWRpxhGMRlmDALu@cluster0.6ixfud0.mongodb.net/?retryWrites=true&w=majority',{useUnifiedTopology : true}, function(err, client){
    // db연결되면 할 일
    if(err) return console.log(err);

    db = client.db('todo');

    db.collection('Post').insertOne({name : 'kori', age : 29, _id : 100} , function(err, result){
        console.log('저장완료');
    });


    app.listen(8003, function(){
        console.log('8003 포트를 이용해서 서버 기동중.')
    });

})

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

app.get('/write', function(req, res){
   res.sendFile(__dirname + '/write.html');
});

app.post('/add', function(req, res){

    db.collection('counter').findOne({name : '게시물갯수'}, function(err, result){
        console.log(result.totalPost)
        let Count = result.totalPost;

        db.collection('Post').insertOne( { _id : Count + 1, title : req.body.title, contents : req.body.contents, date : req.body.date } , function(){
            console.log('저장완료');
            // counter라는 콜렉션에 있는 totalPost항목 1 증가
            db.collection('counter').updateOne({name : '게시물갯수'},{ $inc : {totalPost:1}},function(err, result){
                if(err) {return console.log(error)};

            });
            res.send('전송완료');
        });
    });


});




app.get('/list', function(req, res){
    // 디비에 저장된 Post라는 콜렉션안의 모든 데이터 꺼내기
    db.collection('Post').find().toArray(function(err, result){
        console.log(result);
        res.render('list.ejs', {posts : result});
    });



});


app.delete('/delete', function(req, res){
    console.log(req.body);
    req.body._id = parseInt(req.body._id);
    db.collection('Post').deleteOne(req.body, function(err, result){
        console.log('삭제완료');
        res.status(200).send({ message : "성공했습니다." });
    })

});

app.get('/detail/:id', function(req, res){

    db.collection('Post').findOne({_id : parseInt(req.params.id) }, function(err, result){

        if(err){
            console.error(err);
            res.status(500).send("에러가 발생했습니다.");
        } else if (!result){
            res.status(404).send("게시글을 찾을수가 없습니다.");
        }else{
            res.render('detail.ejs', { data : result } )
        }
    })

})
// :id 파라미터 추가
app.get('/edit/:id', function(req, res){
    db.collection('Post').findOne({_id : parseInt(req.params.id)}, function(err, result){
        console.log(result);
        if(err){
            console.log(err);
            res.status(500).send('에러 발생');
        } else if(!result){
            res.status(404).send('게시물을 찾을수 없습니다.')
        }else {
            res.render('edit.ejs', {post: result})
        }
    })
})

app.put('/edit', function(req, res){
    // db저장된 데이터 update하기.
    db.collection('Post').updateOne({ _id : parseInt(req.body.id) }, { $set : {title : req.body.title, contents : req.body.contents , date : req.body.date}}, function(err, result){
        console.log('수정완료')
        res.redirect('/list')
    })
})
