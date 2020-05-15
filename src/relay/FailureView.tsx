import React from 'react';
import styled from 'styled-components';

import Button from '../components/common/button/Button';

import layout from '../../src/app/layout';

const ContainerStyled = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  width: calc(100% - ${layout.sidebar.width});
  height: 100%;
`;

const MessageStyled = styled.div`
  display: flex';
  flex-direction: column;
  border-radius: 3px;
  border: 1px solid rgba(0, 0, 0, 0.14);
  box-shadow: 0px 3px 8px 0px rgba(0, 0, 0, 0.19);
  background-color: #f8d7da;
  color: #721c24;
  animation: appear 0.4s ease 0s 1 normal;
  align-self: center;

  @keyframes appear {
    0% {
      opacity: 0;
      transform: scale3d(0.3, 0.3, 0.3);
    }

    60% {
      opacity: 1;
      transform: scale3d(1, 1, 1);
    }
  }
  top: 0;
  width: 100%;
  max-width: 400px;
`;

type Props = {
  error: Error;
  retry: () => void;
};

const FailureView = (props: Props) => {
  const { error, retry } = props;
  const { message } = error;
  const buttonRetry = retry ? (
    <Button onClick={retry}>
      <span>Tentar novamente</span>
    </Button>
  ) : null;

  return (
    <ContainerStyled>
      <MessageStyled>
        Erro: {`${message || ''}`}
        {buttonRetry}
      </MessageStyled>
    </ContainerStyled>
  );
};

export default FailureView;
