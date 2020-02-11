import React, {useState} from 'react';
import styled from 'styled-components';
import gql from "graphql-tag";
import moment from 'moment';
import { useQuery, useMutation } from "@apollo/react-hooks";
import { useTranslation } from "react-i18next";

export default function Com(movieID) {

    const [bodyCom, setBodyCom] = useState("");
    const { t } = useTranslation();

    const commentChange = e => {
        setBodyCom(e.target.value);
    }

    const FETCH_COMMENTS = gql`
        query getComments($movId: String!){
            getComments(movieId: $movId){
                id
                username
                body
                movieId
                createdAt
            }
        }
    `

    const ADD_COMMENT = gql`
        mutation addComment($id: String!, $text: String!){
            addComment(movieId: $id, body: $text){
                id
                body
                username
                createdAt
                movieId
            }
        }
    `

    const [addCom] = useMutation(ADD_COMMENT);

    const sendComment = () => {
        if(bodyCom !== ""){
            addCom({variables : {id : movieID.movie, text: bodyCom}});
            window.location.reload();
        }
    }

    const comRes = useQuery(FETCH_COMMENTS, {variables : {movId : movieID.movie}});
    const comments = comRes.data.getComments;    

    if(!comments){
        return (
            <Comment>
                <NewCom>
                    <Form>
                        <Input onChange={commentChange} type="text" name="CommentInput" placeholder={t('viewer.addComment')} />
                        <Send onClick={sendComment} type="submit" name="Send" value={t('viewer.send')} />
                    </Form>
                </NewCom>
                <NoCom>{t('viewer.noComments')}</NoCom>
            </Comment>
        );
    }
    return (
        <Comment>
            <NewCom>
                <Form>
                    <Input onChange={commentChange} type="text" name="CommentInput" placeholder={t('viewer.addComment')} />
                    <Send onClick={sendComment} type="submit" name="Send" value={t('viewer.send')} />
                </Form>
            </NewCom>
            {comments.map((comment,i) => 
                <OldCom key={i}><b>{comment.username}</b><br/>{comment.body}<br/>{moment(comment.createdAt).format("LLL")}</OldCom>
            )}
        </Comment>
    );
}

const Comment = styled.div`
    text-align:left;
    padding: 0 2em;
`

const OldCom = styled.div`
border: 1px solid #fff;
margin-bottom: 2em;
padding: 1em;
background: #696969;
`

const NoCom = styled.h3`
    text-align: center;
`

const NewCom = styled.div`
    margin: 0 auto 2vmin;
`

const Form = styled.div`
`

const Input = styled.input`
    width: 40vmin;
    margin:0.5em 3em;
    background: #666666;
    border: none;
    padding: 1em;
    color: white;
    font-size: 1em;
    ::placeholder,
    ::-webkit-input-placeholder {
    color: white;
    font-size: 1em;
  }
`

const Send = styled.input`
    background: #fff;
    color: #000;
    border: 1px solid #fff;
    font-weight: bold;
    text-transform: uppercase;
    text-align: center;
    padding: 1em 1.5em;
    letter-spacing: 2px;
    cursor: pointer;
    font-size: .9em;
    margin-right: 2em;
`