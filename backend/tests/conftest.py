import pytest

from lap_analyzer.ibt import IbtFile
from lap_analyzer.session import Session
from lap_analyzer.synthetic import SyntheticSession, demo_session


@pytest.fixture(scope="session")
def demo() -> SyntheticSession:
    return demo_session()


@pytest.fixture(scope="session")
def demo_ibt(demo: SyntheticSession) -> IbtFile:
    return IbtFile.from_bytes(demo.ibt)


@pytest.fixture(scope="session")
def session(demo_ibt: IbtFile) -> Session:
    return Session(demo_ibt, "demo.ibt")
